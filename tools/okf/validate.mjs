import { pathToFileURL } from "node:url";
import { repositoryRoot } from "../build/typescript.mjs";
import { validateExtension, OKF_STATUSES } from "./extension.mjs";
import { isSafeRelative } from "./references.mjs";

export { OKF_STATUSES, isSafeRelative };

// Compatibility API for the historical migration command. The active validator uses
// extension.mjs and structured diagnostics; this adapter intentionally returns strings
// only for migrate.mjs's existing human-facing error list.
export async function validateOkf(root = repositoryRoot) {
  const report = await validateExtension(root);
  return report.diagnostics
    .filter((item) => item.severity === "error")
    .map((item) => `${item.file ?? "okf-extension"}: ${item.message}`);
}

async function selfTest() {
  const probes = [
    ["C:\\private\\evidence.txt", false],
    ["../outside.txt", false],
    ["okf/index.md", true],
  ];
  const failed = probes.filter(([value, expected]) => isSafeRelative(value) !== expected);
  if (failed.length > 0) throw new Error("OKF path-policy self-test failed");
  if (OKF_STATUSES.has("PASSED")) throw new Error("OKF status-policy self-test failed");
  process.stdout.write("OKF validator negative policy self-tests passed.\n");
}

async function main() {
  if (process.argv.includes("--self-test")) await selfTest();
  const errors = await validateOkf();
  if (errors.length > 0) {
    process.stderr.write(`OWA extension validation failed with ${errors.length} actionable error(s):\n- ${errors.join("\n- ")}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write("OWA extension validation passed.\n");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
