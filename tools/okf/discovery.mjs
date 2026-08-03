import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { portable } from "./paths.mjs";

function isMarkdown(name) {
  return path.extname(name).toLowerCase() === ".md";
}

function isSamePath(left, right) {
  return path.resolve(left) === path.resolve(right);
}

async function readMarkdown(target) {
  let buffer;
  try {
    buffer = await readFile(target);
  } catch (error) {
    return { text: undefined, readError: error instanceof Error ? error.message : "unreadable file" };
  }
  if (buffer.includes(0)) return { text: undefined, readError: "binary content is not valid Markdown" };
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(buffer) };
  } catch (error) {
    return { text: undefined, readError: error instanceof Error ? error.message : "invalid UTF-8" };
  }
}

export async function discoverOkf(root) {
  const repositoryRoot = path.resolve(root);
  const okfRoot = path.join(repositoryRoot, "okf");
  const artifacts = [];
  let rootStat;
  try {
    rootStat = await lstat(okfRoot);
  } catch (error) {
    artifacts.push({ file: okfRoot, path: "okf", kind: "missing-bundle", text: undefined, error: error instanceof Error ? error.message : "bundle root is missing" });
    return artifacts;
  }
  if (rootStat.isSymbolicLink()) {
    artifacts.push({ file: okfRoot, path: "okf", kind: "unsafe-link", text: undefined, error: "official bundle root must not be a symbolic link or junction" });
    return artifacts;
  }
  if (!rootStat.isDirectory()) {
    artifacts.push({ file: okfRoot, path: "okf", kind: "invalid-bundle-root", text: undefined, error: "official bundle root must be a directory" });
    return artifacts;
  }

  async function visit(directory) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      artifacts.push({ file: directory, path: portable(repositoryRoot, directory), kind: "unreadable-directory", text: undefined, error: error instanceof Error ? error.message : "directory is unreadable" });
      return;
    }
    for (const entry of entries.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0)) {
      const target = path.join(directory, entry.name);
      const relativePath = portable(repositoryRoot, target);
      let stat;
      try {
        stat = await lstat(target);
      } catch (error) {
        artifacts.push({ file: target, path: relativePath, kind: "unreadable", text: undefined, error: error instanceof Error ? error.message : "path is unreadable" });
        continue;
      }
      if (stat.isSymbolicLink()) {
        artifacts.push({ file: target, path: relativePath, kind: "unsafe-link", text: undefined, error: "symbolic links and junctions are not followed" });
        continue;
      }
      if (entry.isDirectory()) {
        let actual;
        try { actual = await realpath(target); } catch (error) {
          artifacts.push({ file: target, path: relativePath, kind: "unreadable-directory", text: undefined, error: error instanceof Error ? error.message : "directory target is unreadable" });
          continue;
        }
        if (!isSamePath(actual, target)) {
          artifacts.push({ file: target, path: relativePath, kind: "unsafe-link", text: undefined, error: "directory junctions and links are not followed" });
          continue;
        }
        if (isMarkdown(entry.name)) artifacts.push({ file: target, path: relativePath, kind: "markdown-directory", text: undefined, error: "directories ending in .md are not Markdown files" });
        await visit(target);
        continue;
      }
      if (!entry.isFile()) {
        artifacts.push({ file: target, path: relativePath, kind: "unknown-artifact", text: undefined, error: "special filesystem entries are not part of an OKF bundle" });
        continue;
      }
      if (!isMarkdown(entry.name)) {
        artifacts.push({ file: target, path: relativePath, kind: "unknown-artifact", text: undefined, error: "only Markdown files are allowed in the official bundle" });
        continue;
      }
      const content = await readMarkdown(target);
      if (content.text === undefined) {
        artifacts.push({ file: target, path: relativePath, kind: "unreadable", text: undefined, error: content.readError });
        continue;
      }
      const baseName = entry.name.toLowerCase();
      let kind = "concept";
      if (relativePath === "okf/index.md") kind = "root-index";
      else if (entry.name === "index.md") kind = "directory-index";
      else if (entry.name === "log.md") kind = "log";
      else if (baseName === "index.md" || baseName === "log.md") kind = "reserved-case";
      artifacts.push({ file: target, path: relativePath, kind, extension: ".md", text: content.text });
    }
  }

  await visit(okfRoot);
  const byCaseInsensitivePath = new Map();
  for (const artifact of artifacts) {
    if (!artifact.path.startsWith("okf/") || artifact.kind === "case-collision") continue;
    const key = artifact.path.toLowerCase();
    const entries = byCaseInsensitivePath.get(key) ?? [];
    entries.push(artifact.path);
    byCaseInsensitivePath.set(key, entries);
  }
  for (const [key, paths] of byCaseInsensitivePath) {
    if (new Set(paths).size > 1) artifacts.push({ file: undefined, path: key, kind: "case-collision", text: undefined, paths: [...new Set(paths)].sort() });
  }
  if (!artifacts.some((artifact) => artifact.kind === "root-index")) artifacts.push({ file: path.join(okfRoot, "index.md"), path: "okf/index.md", kind: "missing-root-index", text: undefined });
  return artifacts.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
}
