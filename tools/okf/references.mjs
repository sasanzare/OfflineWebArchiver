import { lstat, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { execFile as execFileCallback } from "node:child_process";
import { diagnostic } from "./diagnostics.mjs";
import { parseFrontmatter } from "./frontmatter.mjs";
import { hasParentTraversal, isFilesystemAbsolute, isWithin, portable, resolveBundlePath, isSafeRepositoryRelative } from "./paths.mjs";

const execFile = promisify(execFileCallback);
const githubPermalink = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i;

export function isSafeRelative(value) {
  return isSafeRepositoryRelative(value);
}

function refDiagnostic(ruleId, message, file, severity = "error", details = {}) {
  return diagnostic("references", ruleId, message, file, severity, details);
}

function isLikelyLocalPath(resource) {
  return resource.startsWith("/") || resource.startsWith(".") || /[\\/]/.test(resource) || /^[^\s/\\]+\.[A-Za-z0-9_-]+$/.test(resource);
}

function decodePath(value) {
  try { return decodeURIComponent(value); } catch { return undefined; }
}

function parseGithubPermalink(resource) {
  const match = githubPermalink.exec(resource);
  if (!match) {
    try {
      const url = new URL(resource);
      const segments = url.pathname.split("/").filter(Boolean);
      if (segments[2]?.toLowerCase() === "blob") return { error: "GitHub blob permalink must use the form /owner/repository/blob/{full-commit-sha}/{path}." };
    } catch {}
    return undefined;
  }
  const pathPart = decodePath(match[4]);
  if (!pathPart || pathPart.split("/").some((segment) => segment === ".." || segment === "")) return { error: "GitHub blob permalink must contain a non-empty repository path without traversal." };
  if (!/^[0-9a-f]{40}$/i.test(match[3])) return { error: "GitHub blob permalink must use a full 40-character commit SHA, not a branch or tag." };
  if (resource.includes("#") || resource.includes("?")) return { error: "GitHub blob permalinks must not include query or fragment state." };
  return { owner: match[1], repository: match[2], sha: match[3], path: pathPart };
}

function repositoryName(remote) {
  const match = /github\.com[/:]([^/]+)\/([^/]+)$/i.exec(remote.trim());
  return match ? `${match[1]}/${match[2].replace(/\.git$/i, "")}`.toLowerCase() : undefined;
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

async function verifySameRepositoryPermalink(root, target) {
  const identity = await localRepositoryName(root);
  if (identity === null) return { status: "local-check-unavailable" };
  if (identity !== `${target.owner}/${target.repository}`.toLowerCase()) return { status: "not-local-repository" };
  try {
    await execFile("git", ["cat-file", "-e", `${target.sha}^{commit}`], { cwd: root, windowsHide: true, timeout: 3000 });
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
    if (response.status === 404) return { status: "remotely-not-found", statusCode: response.status };
    if (response.status === 401 || response.status === 403 || response.status === 429) return { status: "remote-not-authoritatively-checked", statusCode: response.status };
    if (!response.ok) return { status: "remote-error", statusCode: response.status };
    return { status: "remotely-verified", statusCode: response.status };
  } catch (error) {
    return { status: error?.name === "AbortError" ? "remote-timeout" : "remote-network-error" };
  } finally {
    clearTimeout(timer);
  }
}

async function validateResource(resource, artifact, root, options) {
  const raw = resource.trim();
  const base = { file: artifact.path, resource: raw };
  if (raw.length === 0) return { diagnostics: [refDiagnostic("OKF-SOURCE-RESOURCE-MISSING", "A source resource must be a non-empty string.", artifact.path)], check: { ...base, status: "invalid" } };
  if (/\s/.test(raw)) return { diagnostics: [refDiagnostic("OKF-SOURCE-URL-INVALID", "A source URL or path must not contain unescaped whitespace.", artifact.path)], check: { ...base, status: "invalid" } };
  if (/^file:/i.test(raw) || (isFilesystemAbsolute(raw) && !raw.startsWith("/"))) return { diagnostics: [refDiagnostic("OKF-SOURCE-ABSOLUTE", "A source resource must not be an absolute filesystem path.", artifact.path, "error", { suggestion: "Use a bundle-relative path or an HTTPS URL." })], check: { ...base, status: "unsafe-absolute" } };

  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !raw.startsWith("/")) {
    let url;
    try { url = new URL(raw); } catch (error) {
      return { diagnostics: [refDiagnostic("OKF-SOURCE-URL-INVALID", `Source resource is not a valid absolute URL: ${error instanceof Error ? error.message : "invalid URL"}.`, artifact.path)], check: { ...base, status: "invalid-url" } };
    }
    if (url.protocol === "http:" || url.protocol === "https:") {
      if (url.hostname.toLowerCase() === "github.com") {
        const permalink = parseGithubPermalink(raw);
        if (permalink?.error) return { diagnostics: [refDiagnostic("OKF-SOURCE-PERMALINK-NOT-IMMUTABLE", permalink.error, artifact.path, "error", { suggestion: "Use https://github.com/{owner}/{repo}/blob/{full-commit-sha}/{path}." })], check: { ...base, status: "invalid-github-permalink" } };
        if (permalink) {
          const local = await verifySameRepositoryPermalink(root, permalink);
          if (local.status === "path-not-found-locally") return { diagnostics: [refDiagnostic("OKF-SOURCE-NOT-FOUND", `GitHub permalink path '${permalink.path}' does not exist at commit ${permalink.sha}.`, artifact.path)], check: { ...base, kind: "github-permalink", ...permalink, status: local.status } };
          if (options.remote && ["not-local-repository", "commit-not-present-locally", "local-check-failed"].includes(local.status)) {
            const remote = await checkRemote(raw);
            if (remote.status === "remotely-not-found") return { diagnostics: [refDiagnostic("OKF-SOURCE-REMOTE-NOT-FOUND", "Remote source returned HTTP 404.", artifact.path)], check: { ...base, kind: "github-permalink", ...permalink, status: remote.status } };
            return { diagnostics: [], check: { ...base, kind: "github-permalink", ...permalink, status: remote.status, localStatus: local.status } };
          }
          return { diagnostics: [], check: { ...base, kind: "github-permalink", ...permalink, status: local.status } };
        }
      }
      if (options.remote) {
        const remote = await checkRemote(raw);
        if (remote.status === "remotely-not-found") return { diagnostics: [refDiagnostic("OKF-SOURCE-REMOTE-NOT-FOUND", "Remote source returned HTTP 404.", artifact.path)], check: { ...base, status: remote.status, statusCode: remote.statusCode } };
        return { diagnostics: [], check: { ...base, status: remote.status, statusCode: remote.statusCode } };
      }
      return { diagnostics: [], check: { ...base, status: "syntactically-valid-not-checked" } };
    }
    return { diagnostics: [], check: { ...base, status: "syntactically-valid-not-checked", scheme: url.protocol.slice(0, -1) } };
  }

  if (!isLikelyLocalPath(raw)) return { diagnostics: [], check: { ...base, status: "scope-descriptor" } };
  if (raw.startsWith("\\") || (raw.startsWith("/") && raw.startsWith("//"))) return { diagnostics: [refDiagnostic("OKF-SOURCE-ABSOLUTE", "A source resource must not be an absolute filesystem or UNC path.", artifact.path)], check: { ...base, status: "unsafe-absolute" } };
  if (hasParentTraversal(raw) && !resolveBundlePath(path.join(root, "okf"), artifact.file, raw).inside) return { diagnostics: [refDiagnostic("OKF-SOURCE-TRAVERSAL", "Source path traversal escapes the official OKF bundle.", artifact.path, "error", { suggestion: "Keep relative source targets inside okf/." })], check: { ...base, status: "unsafe-traversal" } };
  const bundleRoot = path.join(root, "okf");
  const resolution = resolveBundlePath(bundleRoot, artifact.file, raw);
  if (!resolution.inside) return { diagnostics: [refDiagnostic("OKF-SOURCE-TRAVERSAL", "Source path resolves outside the official OKF bundle.", artifact.path)], check: { ...base, status: "unsafe-traversal" } };
  try {
    const sourceStat = await lstat(resolution.candidate);
    if (sourceStat.isSymbolicLink()) return { diagnostics: [refDiagnostic("OKF-SOURCE-UNSAFE-LINK", "Source resources must not resolve through a symbolic link or junction.", artifact.path)], check: { ...base, status: "unsafe-link" } };
    if (!(await stat(resolution.candidate)).isFile()) return { diagnostics: [refDiagnostic("OKF-SOURCE-NOT-FILE", `Source resource is not a regular file: '${raw}'.`, artifact.path)], check: { ...base, status: "not-a-file" } };
    return { diagnostics: [], check: { ...base, status: "locally-verified", resolvedPath: portable(root, resolution.candidate) } };
  } catch {
    return { diagnostics: [refDiagnostic("OKF-SOURCE-NOT-FOUND", `Local source resource does not exist: '${raw}'.`, artifact.path)], check: { ...base, status: "not-found" } };
  }
}

function resolveLinkTarget(artifactPath, raw, paths) {
  const withoutFragment = raw.split("#", 1)[0].split("?", 1)[0];
  if (!withoutFragment || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(withoutFragment)) return { ignored: true };
  const normalizedRaw = withoutFragment.replaceAll("\\", "/");
  const target = normalizedRaw.startsWith("/")
    ? path.posix.normalize(path.posix.join("okf", normalizedRaw.slice(1)))
    : path.posix.normalize(path.posix.join(path.posix.dirname(artifactPath), normalizedRaw));
  if (target !== "okf" && !target.startsWith("okf/")) return { traversal: true };
  const candidates = [target, target.endsWith("/") ? `${target}index.md` : `${target}/index.md`];
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
      if (resolution.traversal) diagnostics.push(refDiagnostic("OKF-LINK-TRAVERSAL", `Internal Markdown link '${raw}' escapes the official bundle.`, artifact.path));
      else if (!paths.has(resolution.target)) diagnostics.push(refDiagnostic("OKF-LINK-BROKEN", `Internal Markdown link '${raw}' has no target in the bundle.`, artifact.path, "warning", { suggestion: "Add the target Concept/index or use an external URL." }));
    }
  }
  return diagnostics;
}

export async function validateReferences(artifacts, root, options = {}) {
  const diagnostics = [];
  const checks = [];
  for (const artifact of artifacts.filter((item) => item.kind === "concept" && item.text !== undefined)) {
    const parsed = artifact.parsed ?? parseFrontmatter(artifact.text);
    artifact.parsed = parsed;
    if (parsed.error || !parsed.metadata || typeof parsed.metadata !== "object" || Array.isArray(parsed.metadata)) continue;
    const metadata = parsed.metadata;
    if (metadata.sources !== undefined) {
      if (!Array.isArray(metadata.sources)) diagnostics.push(refDiagnostic("OKF-SOURCE-INVALID", "sources must be a list when present.", artifact.path));
      else {
        for (const source of metadata.sources) {
          if (!source || typeof source !== "object" || typeof source.resource !== "string") {
            diagnostics.push(refDiagnostic("OKF-SOURCE-RESOURCE-MISSING", "Each sources entry must contain a resource string.", artifact.path));
            continue;
          }
          const result = await validateResource(source.resource, artifact, root, options);
          diagnostics.push(...result.diagnostics);
          checks.push({ ...result.check, sourceId: typeof source.id === "string" ? source.id : undefined });
        }
      }
    }
    for (const field of ["resource", "computation"]) {
      if (typeof metadata[field] !== "string") continue;
      const result = await validateResource(metadata[field], artifact, root, options);
      diagnostics.push(...result.diagnostics);
      checks.push({ ...result.check, field });
    }
    for (const owner of ["executor", "attester"]) {
      if (!metadata[owner] || typeof metadata[owner] !== "object" || typeof metadata[owner].resource !== "string") continue;
      const result = await validateResource(metadata[owner].resource, artifact, root, options);
      diagnostics.push(...result.diagnostics);
      checks.push({ ...result.check, field: `${owner}.resource` });
    }
  }
  diagnostics.push(...validateLinks(artifacts));
  return { diagnostics, checks };
}
