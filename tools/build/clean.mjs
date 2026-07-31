import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import { repositoryRoot } from "./typescript.mjs";

function assertOwned(target) {
  const relative = path.relative(repositoryRoot, path.resolve(target));
  const allowed =
    relative === ".build-tests" ||
    /^(?:apps|packages)[\\/][^\\/]+[\\/]dist$/.test(relative) ||
    /^(?:apps|packages)[\\/][^\\/]+[\\/].+\.tsbuildinfo$/.test(relative) ||
    /^[^\\/]+\.tsbuildinfo$/.test(relative);
  if (!allowed || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to clean unowned path: ${relative}`);
  }
}

const targets = [path.join(repositoryRoot, ".build-tests")];
for (const parent of ["apps", "packages"]) {
  const parentPath = path.join(repositoryRoot, parent);
  for (const entry of await readdir(parentPath, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    targets.push(path.join(parentPath, entry.name, "dist"));
    const packageFiles = await readdir(path.join(parentPath, entry.name));
    for (const name of packageFiles) {
      if (name.endsWith(".tsbuildinfo")) {
        targets.push(path.join(parentPath, entry.name, name));
      }
    }
  }
}

for (const target of targets) {
  assertOwned(target);
  await rm(target, { recursive: true, force: true });
}
process.stdout.write(`Removed ${targets.length} generated production paths.\n`);

