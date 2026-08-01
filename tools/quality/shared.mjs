import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { repositoryRoot } from "../build/typescript.mjs";

const ignored = new Set([".git", ".build-tests", ".runtime", ".npm-cache", "node_modules", "dist", "build", "output", ".playwright-browsers"]);

export async function repositoryFiles(root = repositoryRoot) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await repositoryFiles(target)));
    if (entry.isFile()) files.push(target);
  }
  return files;
}

export async function readTextFiles(extensions) {
  const files = (await repositoryFiles()).filter((file) =>
    extensions.has(path.extname(file).toLowerCase()),
  );
  return Promise.all(
    files.map(async (file) => ({ file, text: await readFile(file, "utf8") })),
  );
}

export function relative(file) {
  return path.relative(repositoryRoot, file).split(path.sep).join("/");
}
