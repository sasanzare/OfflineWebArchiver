import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const spikeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const names = [".playwright-browsers", "build", "dist", "output"];
for (const name of names) {
  const target = path.resolve(spikeRoot, name);
  const relative = path.relative(spikeRoot, target);
  if (relative !== name || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Refusing to clean a path outside the spike root.");
  }
  process.stdout.write(`Removing generated spike path: ${name}\n`);
  await rm(target, { recursive: true, force: true });
}

