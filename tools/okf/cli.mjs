import { pathToFileURL } from "node:url";
import { layers } from "./diagnostics.mjs";
import { validateAll } from "./validate-all.mjs";

export const validatorVersion = "1.1.0";

function options(args) {
  const layer = args.includes("--layer") ? args[args.indexOf("--layer") + 1] : undefined;
  return { layer, json: args.includes("--format") && args[args.indexOf("--format") + 1] === "json" };
}

export function buildJsonReport(report, diagnostics = report.diagnostics) {
  const errors = diagnostics.filter((item) => item.severity === "error");
  const warnings = diagnostics.filter((item) => item.severity !== "error");
  return { schemaVersion: "1.0.0", validator: { name: "offline-web-archiver-okf", version: validatorVersion }, okfVersion: "0.2", result: errors.length === 0 ? "pass" : "fail", exitCode: errors.length === 0 ? 0 : 1, artifacts: report.artifacts.map(({ path, kind }) => ({ path, kind })), diagnostics, errors: errors.length, warnings: warnings.length };
}

export function buildHumanOutput(diagnostics, layer) {
  const groups = layer ? [layer] : ["official", "policy", "extension", "quality", "format"];
  let output = "";
  for (const group of groups) {
    const items = diagnostics.filter((item) => item.layer === group);
    output += `${group}: ${items.filter((item) => item.severity === "error").length} error(s), ${items.filter((item) => item.severity !== "error").length} warning(s)\n`;
    for (const item of items) output += `  ${item.code} ${item.file}: ${item.message}\n`;
  }
  return output;
}

export async function run(args = process.argv.slice(2)) {
  if (args[0] !== "validate") { process.stderr.write("Usage: node tools/okf/cli.mjs validate [--layer NAME] [--format json]\n"); return 2; }
  const config = options(args);
  if (config.layer !== undefined && !layers.has(config.layer)) { process.stderr.write(`Unknown validation layer '${config.layer}'.\n`); return 2; }
  const report = await validateAll();
  const diagnostics = config.layer ? report.diagnostics.filter((item) => item.layer === config.layer) : report.diagnostics;
  const errors = diagnostics.filter((item) => item.severity === "error");
  if (config.json) process.stdout.write(`${JSON.stringify(buildJsonReport(report, diagnostics), null, 2)}\n`);
  else process.stdout.write(buildHumanOutput(diagnostics, config.layer));
  return errors.length === 0 ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = await run();
