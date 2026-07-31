import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const spikeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const kind = process.argv[2] ?? "all";
const allowed = new Set(["all", "unit", "integration"]);
if (!allowed.has(kind)) {
  process.stderr.write("Test kind must be all, unit, or integration.\n");
  process.exit(2);
}

const kinds = kind === "all" ? ["unit", "integration"] : [kind];
const files = [];
for (const current of kinds) {
  const directory = path.join(spikeRoot, "build", "tests", current);
  const entries = await readdir(directory);
  files.push(
    ...entries
      .filter((name) => name.endsWith(".test.js"))
      .sort()
      .map((name) => path.join(directory, name)),
  );
}

if (files.length === 0) {
  process.stderr.write("No compiled tests were found.\n");
  process.exit(2);
}

const child = spawn(process.execPath, ["--test", "--test-isolation=none", ...files], {
  cwd: spikeRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    PLAYWRIGHT_BROWSERS_PATH: path.join(spikeRoot, ".playwright-browsers"),
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1",
  },
});
const exitCode = await new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", (code) => resolve(code ?? 1));
});
process.exit(exitCode);
