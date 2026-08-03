import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";

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
      if (stat.isSymbolicLink()) continue;
      if (entry.isDirectory()) await visit(target);
      else if (entry.isFile()) files.push(target);
    }
  }
  await visit(okfRoot);
  const artifacts = [];
  for (const file of files.sort()) {
    const relativePath = portable(root, file);
    const extension = path.extname(file).toLowerCase();
    const text = extension === ".md" ? await readFile(file, "utf8") : undefined;
    let kind = extension === ".md" ? "unknown-markdown" : extension === ".json" ? "extension-json" : "other";
    if (relativePath === "okf/index.md") kind = "root-index";
    else if (relativePath.endsWith("/index.md")) kind = "directory-index";
    else if (relativePath.endsWith("/log.md")) kind = "log";
    else if (relativePath.startsWith("okf/extensions/")) kind = "extension-documentation";
    else if (text?.includes("Transitional Legacy Artifact")) kind = "transitional-legacy";
    else if (text?.startsWith("---\n")) kind = "concept";
    artifacts.push({ file, path: relativePath, extension, text, kind });
  }
  return artifacts;
}
