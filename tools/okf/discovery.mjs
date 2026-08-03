import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { hasFrontmatter } from "./frontmatter.mjs";

function portable(root, file) {
  return path.relative(root, file).split(path.sep).join("/");
}

export async function discoverOkf(root) {
  const okfRoot = path.join(root, "okf");
  const files = [];
  async function visit(directory) {
    let entries;
    try { entries = await readdir(directory, { withFileTypes: true }); } catch (error) { throw new Error(`Cannot read ${portable(root, directory)}: ${error.message}`); }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, "en"))) {
      const target = path.join(directory, entry.name);
      const stat = await lstat(target);
      if (stat.isSymbolicLink()) {
        files.push({ file: target, symlink: true });
        continue;
      }
      if (entry.isDirectory()) await visit(target);
      else if (entry.isFile()) files.push({ file: target, symlink: false });
    }
  }
  await visit(okfRoot);
  const artifacts = [];
  for (const entry of files.sort((left, right) => left.file < right.file ? -1 : left.file > right.file ? 1 : 0)) {
    const file = entry.file;
    const relativePath = portable(root, file);
    const extension = path.extname(file).toLowerCase();
    const text = !entry.symlink && extension === ".md" ? await readFile(file, "utf8") : undefined;
    let kind = entry.symlink ? "unsafe-symlink" : extension === ".md" ? "unknown-markdown" : "unknown-artifact";
    if (!entry.symlink) {
      if (relativePath === "okf/index.md") kind = "root-index";
      else if (relativePath.endsWith("/index.md")) kind = "directory-index";
      else if (relativePath.endsWith("/log.md")) kind = "log";
      else if (relativePath === "okf/manifest.json") kind = "manifest";
      else if (/^okf\/registry\/[^/]+\.json$/.test(relativePath)) kind = "registry";
      else if (/^okf\/validation\/schemas\/[^/]+\.json$/.test(relativePath)) kind = "schema";
      else if (relativePath.startsWith("okf/extensions/")) kind = "extension-documentation";
      else if (text?.includes("Transitional Legacy Artifact")) kind = "transitional-legacy";
      else if (text !== undefined && hasFrontmatter(text)) kind = "concept";
    }
    artifacts.push({ file, path: relativePath, extension, text, kind });
  }
  return artifacts;
}
