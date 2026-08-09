import { lstat, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { execFile as execFileCallback } from "node:child_process";
import { diagnostic } from "./diagnostics.mjs";
import { parseFrontmatter } from "./frontmatter.mjs";
import { portable, resolveBundlePath, isSafeRepositoryRelative } from "./paths.mjs";

const execFile = promisify(execFileCallback);
const githubHost = "github.com";
const posixDeveloperPath = /^\/(?:home|Users|tmp|var|private|root|mnt|workspace)(?:\/|$)/i;

function refDiagnostic(ruleId, message, file, severity = "error", details = {}) {
  return diagnostic("references", ruleId, message, file, severity, details);
}

function isPathTraversal(value) {
  return typeof value === "string" && value.split(/[\\/]/).some((segment) => segment === "..");
}

function decodePath(value) {
  try { return decodeURIComponent(value); } catch { return undefined; }
}

export function parseGithubPermalink(resource) {
  let url;
  try { url = new URL(resource); } catch { return { error: "GitHub URL is not syntactically valid." }; }
  if (url.hostname.toLowerCase() !== githubHost || url.protocol.toLowerCase() !== "https:") return undefined;
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments[2]?.toLowerCase() !== "blob") return undefined;
  if (segments.length < 5) return { error: "GitHub blob URL must include a ref and non-empty repository path." };
  const pathPart = decodePath(segments.slice(4).join("/"));
  if (!pathPart || pathPart.split("/").some((segment) => segment === ".." || segment === "")) return { error: "GitHub blob URL must contain a non-empty repository path without traversal." };
  const ref = segments[3];
  const fullSha = /^[0-9a-f]{40}$/i.test(ref);
  const immutable = fullSha && !url.search && !url.hash;
  return {
    owner: segments[0],
    repository: segments[1],
    ref,
    sha: fullSha ? ref : undefined,
    path: pathPart,
    immutable,
    hasQueryOrFragment: Boolean(url.search || url.hash),
  };
}

function isDeveloperAbsolutePath(value) {
  return /^[A-Za-z]:[\\/]/.test(value) || /^\\\\/.test(value) || /^~[\\/]/.test(value) || /^file:/i.test(value) || posixDeveloperPath.test(value);
}

export function classifyResource(resource) {
  if (typeof resource !== "string") return { kind: "invalid", reason: "resource must be a string" };
  const raw = resource.trim();
  if (raw.length === 0) return { kind: "invalid", reason: "resource must be a non-empty string" };
  if (isDeveloperAbsolutePath(raw)) return { kind: "filesystem-absolute-path", raw };
  if (/^[A-Za-z]:[\\/]/.test(raw) || /^\\\\/.test(raw) || /^~[\\/]/.test(raw) || /^file:/i.test(raw)) return { kind: "filesystem-absolute-path", raw };
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) {
    if (/\s/.test(raw)) return { kind: "invalid", reason: "absolute URLs must not contain unescaped whitespace", raw };
    let url;
    try { url = new URL(raw); } catch { return { kind: "invalid", reason: "resource is not a valid absolute URL", raw }; }
    if ((url.protocol === "http:" || url.protocol === "https:") && url.hostname.toLowerCase() === githubHost) {
      const github = parseGithubPermalink(raw);
      if (github?.error) return { kind: "github-permalink", invalid: true, reason: github.error, raw };
      if (github) return { kind: "github-permalink", ...github, raw };
    }
    return { kind: "absolute-url", protocol: url.protocol.slice(0, -1), raw };
  }
  if (raw.startsWith("/")) return { kind: "bundle-relative-path", raw };
  if (/\s/.test(raw)) return { kind: "scope-descriptor", raw };
  if (raw.startsWith(".") || raw.includes("/") || raw.includes("\\") || /^[^\s/\\]+\.[A-Za-z0-9_-]+$/.test(raw)) return { kind: "relative-path", raw };
  return { kind: "scope-descriptor", raw };
}

export function isSafeRelative(value) {
  return isSafeRepositoryRelative(value);
}

function repositoryName(remote) {
  const match = /github\.com[/:]([^/]+)\/([^/]+)$/.exec(remote.trim().replace(/\/$/, ""));
  return match ? (match[1] + "/" + match[2].replace(/\.git$/i, "")).toLowerCase() : undefined;
}

async function localRepositoryName(root) {
  try {
    const result = await execFile("git", ["remote", "get-url", "origin"], { cwd: root, windowsHide: true, timeout: 3000 });
    return repositoryName(result.stdout);
  } catch (error) {
    if (error?.code === "EPERM" || error?.code === "ENOENT") return null;
    return undefined;
  }
}

export async function verifySameRepositoryPermalink(root, target) {
  const identity = await localRepositoryName(root);
  if (identity === null || identity === undefined) return { status: "local-check-unavailable" };
  if (identity !== (target.owner + "/" + target.repository).toLowerCase()) return { status: "not-local-repository" };
  try {
    await execFile("git", ["cat-file", "-e", target.sha + "^{commit}"], { cwd: root, windowsHide: true, timeout: 3000 });
  } catch {
    return { status: "commit-not-present-locally" };
  }
  try {
    const result = await execFile("git", ["ls-tree", "-r", "--name-only", target.sha, "--", target.path], { cwd: root, windowsHide: true, timeout: 3000 });
    if (result.stdout.trim().split(/\r?\n/).includes(target.path)) return { status: "locally-verified" };
    return { status: "path-not-found-locally" };
  } catch {
    return { status: "local-check-failed" };
  }
}

async function checkRemote(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal });
    if (response.status === 404) return { status: "remote-target-missing", statusCode: response.status };
    if (response.status === 401 || response.status === 403 || response.status === 429) return { status: "remote-target-not-checked", statusCode: response.status };
    if (!response.ok) return { status: "remote-check-failed", statusCode: response.status };
    return { status: "remote-target-verified", statusCode: response.status };
  } catch (error) {
    return { status: error?.name === "AbortError" ? "remote-check-timeout" : "remote-check-unavailable" };
  } finally {
    clearTimeout(timer);
  }
}

export { checkRemote };

async function validateResource(resource, artifact, root, options = {}) {
  const classification = classifyResource(resource);
  const raw = typeof resource === "string" ? resource.trim() : resource;
  const base = { file: artifact.path, resource: raw, classification: classification.kind };
  if (classification.kind === "invalid") return { diagnostics: [refDiagnostic("OWA-REF-RESOURCE-SYNTAX", "Source resource is invalid: " + classification.reason + ".", artifact.path)], check: { ...base, status: "invalid" } };
  if (classification.kind === "filesystem-absolute-path") return { diagnostics: [], check: { ...base, status: "local-absolute-path" } };
  if (classification.kind === "scope-descriptor") return { diagnostics: [], check: { ...base, status: "scope-descriptor" } };

  if (classification.kind === "absolute-url" || classification.kind === "github-permalink") {
    if (classification.invalid) return { diagnostics: [refDiagnostic("OWA-REF-GITHUB-URL-MALFORMED", classification.reason, artifact.path)], check: { ...base, status: "invalid-url" } };
    if (options.remote && /^https?:$/i.test(classification.protocol ?? "https:")) {
      const remote = await checkRemote(raw);
      if (remote.status === "remote-target-missing") return { diagnostics: [refDiagnostic("OWA-REF-REMOTE-NOT-FOUND", "Remote reference returned HTTP 404.", artifact.path)], check: { ...base, ...remote } };
      return { diagnostics: [], check: { ...base, ...remote } };
    }
    return { diagnostics: [], check: { ...base, status: "remote-target-not-checked" } };
  }

  const bundleRoot = path.join(root, "okf");
  const resolution = resolveBundlePath(bundleRoot, artifact.file, raw);
  if (isPathTraversal(raw) && !resolution.inside) return { diagnostics: [refDiagnostic("OWA-REF-TRAVERSAL", "Reference path escapes the official OKF bundle.", artifact.path, "error", { suggestion: "Keep local reference targets inside okf/." })], check: { ...base, status: "reference-target-unsafe" } };
  if (!resolution.inside) return { diagnostics: [refDiagnostic("OWA-REF-TRAVERSAL", "Reference path resolves outside the official OKF bundle.", artifact.path)], check: { ...base, status: "reference-target-unsafe" } };
  try {
    const sourceStat = await lstat(resolution.candidate);
    if (sourceStat.isSymbolicLink()) return { diagnostics: [refDiagnostic("OWA-REF-UNSAFE-LINK", "Reference targets must not resolve through a symbolic link or junction.", artifact.path)], check: { ...base, status: "reference-target-unsafe" } };
    if (!(await stat(resolution.candidate)).isFile()) return { diagnostics: [refDiagnostic("OWA-REF-LOCAL-NOT-FILE", "Reference target is not a regular file: '" + raw + "'.", artifact.path)], check: { ...base, status: "reference-target-invalid" } };
    return { diagnostics: [], check: { ...base, status: "local-target-verified", resolvedPath: portable(root, resolution.candidate) } };
  } catch {
    return { diagnostics: [refDiagnostic("OWA-REF-LOCAL-NOT-FOUND", "Local reference target does not exist: '" + raw + "'.", artifact.path)], check: { ...base, status: "reference-target-missing" } };
  }
}

export { validateResource };

function resolveLinkTarget(artifactPath, raw, paths) {
  const withoutFragment = raw.split("#", 1)[0].split("?", 1)[0];
  if (!withoutFragment || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(withoutFragment)) return { ignored: true };
  const normalizedRaw = withoutFragment.replaceAll("\\", "/");
  const target = normalizedRaw.startsWith("/")
    ? path.posix.normalize(path.posix.join("okf", normalizedRaw.slice(1)))
    : path.posix.normalize(path.posix.join(path.posix.dirname(artifactPath), normalizedRaw));
  if (target !== "okf" && !target.startsWith("okf/")) return { traversal: true };
  const candidates = [target, target.endsWith("/") ? target + "index.md" : target + "/index.md"];
  return { target: candidates.find((candidate) => paths.has(candidate)) ?? target };
}

function validateLinks(artifacts) {
  const diagnostics = [];
  const paths = new Set(artifacts.filter((artifact) => artifact.path?.startsWith("okf/") && artifact.extension === ".md" && artifact.text !== undefined).map((artifact) => artifact.path));
  for (const artifact of artifacts.filter((item) => item.extension === ".md" && item.text !== undefined)) {
    for (const match of artifact.text.matchAll(/(?<!!)\[[^\]]*\]\(([^)]+)\)/g)) {
      const raw = match[1].trim().replace(/^<|>$/g, "");
      const resolution = resolveLinkTarget(artifact.path, raw, paths);
      if (resolution.ignored) continue;
      if (resolution.traversal) diagnostics.push(refDiagnostic("OWA-REF-TRAVERSAL", "Internal Markdown link '" + raw + "' escapes the official bundle.", artifact.path));
      else if (!paths.has(resolution.target)) diagnostics.push(refDiagnostic("OWA-REF-LINK-BROKEN", "Internal Markdown link '" + raw + "' has no target in the bundle.", artifact.path, "warning", { suggestion: "Add the target Concept/index or use an external URL." }));
    }
  }
  return diagnostics;
}

export async function validateReferences(artifacts, root, options = {}) {
  const diagnostics = [];
  const checks = [];
  let repositoryRoot = path.resolve(root);
  try {
    repositoryRoot = await realpath(repositoryRoot);
  } catch {
    // Preserve the resolved input for intentionally missing-root probes.
  }
  for (const artifact of artifacts.filter((item) => item.kind === "concept" && item.text !== undefined)) {
    const parsed = artifact.parsed ?? parseFrontmatter(artifact.text);
    artifact.parsed = parsed;
    if (parsed.error || !parsed.metadata || typeof parsed.metadata !== "object" || Array.isArray(parsed.metadata)) continue;
    const metadata = parsed.metadata;
    if (metadata.sources !== undefined) {
      if (!Array.isArray(metadata.sources)) diagnostics.push(refDiagnostic("OWA-REF-SOURCES-NOT-LIST", "sources must be a list when present.", artifact.path));
      else {
        for (const source of metadata.sources) {
          if (!source || typeof source !== "object" || typeof source.resource !== "string" || source.resource.trim() === "") {
            diagnostics.push(refDiagnostic("OWA-REF-SOURCE-RESOURCE-MISSING", "Each sources entry must contain a non-empty resource string.", artifact.path));
            continue;
          }
          const result = await validateResource(source.resource, artifact, repositoryRoot, options);
          diagnostics.push(...result.diagnostics);
          checks.push({ ...result.check, sourceId: typeof source.id === "string" ? source.id : undefined });
        }
      }
    }
    for (const field of ["resource", "computation"]) {
      if (typeof metadata[field] !== "string") continue;
      const result = await validateResource(metadata[field], artifact, repositoryRoot, options);
      diagnostics.push(...result.diagnostics);
      checks.push({ ...result.check, field });
    }
    for (const owner of ["executor", "attester"]) {
      if (!metadata[owner] || typeof metadata[owner] !== "object" || typeof metadata[owner].resource !== "string") continue;
      const result = await validateResource(metadata[owner].resource, artifact, repositoryRoot, options);
      diagnostics.push(...result.diagnostics);
      checks.push({ ...result.check, field: owner + ".resource" });
    }
  }
  diagnostics.push(...validateLinks(artifacts));
  return { diagnostics, checks };
}
