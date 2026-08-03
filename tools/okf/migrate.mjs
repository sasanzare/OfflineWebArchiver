import { pathToFileURL } from "node:url";

export const deprecationMessage = "OKF migration is complete; use npm run okf:validate and docs/okf-conformance/ for current maintenance.";

export async function run(args = process.argv.slice(2)) {
  void args;
  process.stderr.write(`${deprecationMessage}\n`);
  return 2;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = await run();
