import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

export function runTypeScriptBuild(projects = []) {
  const compiler = path.join(
    repositoryRoot,
    "node_modules",
    "typescript",
    "bin",
    "tsc",
  );
  const result = spawnSync(
    process.execPath,
    [compiler, "-b", "--pretty", "false", ...projects],
    { cwd: repositoryRoot, stdio: "inherit" },
  );
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

