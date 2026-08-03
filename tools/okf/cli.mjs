import { pathToFileURL } from "node:url";
import { validateAll } from "./validate-all.mjs";

function options(args) {
  const layer = args.includes("--layer") ? args[args.indexOf("--layer") + 1] : undefined;
  return { layer, json: args.includes("--format") && args[args.indexOf("--format") + 1] === "json" };
}

export async function run(args = process.argv.slice(2)) {
  if (args[0] !== "validate") { process.stderr.write("Usage: node tools/okf/cli.mjs validate [--layer NAME] [--format json]\n"); return 2; }
  const config = options(args); const report = await validateAll();
  const diagnostics = config.layer ? report.diagnostics.filter((item) => item.layer === config.layer) : report.diagnostics;
  const errors = diagnostics.filter((item) => item.severity === "error");
  if (config.json) process.stdout.write(`${JSON.stringify({ artifacts: report.artifacts.map(({ path, kind }) => ({ path, kind })), diagnostics, errors: errors.length }, null, 2)}\n`);
  else {
    const groups = ["official", "policy", "extension", "quality", "format"];
    for (const layer of groups) { const items = diagnostics.filter((item) => item.layer === layer); process.stdout.write(`${layer}: ${items.filter((item) => item.severity === "error").length} error(s), ${items.filter((item) => item.severity !== "error").length} warning(s)\n`); for (const item of items) process.stdout.write(`  ${item.code} ${item.file}: ${item.message}\n`); }
  }
  return errors.length === 0 ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = await run();
