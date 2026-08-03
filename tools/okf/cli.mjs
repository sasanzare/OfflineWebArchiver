import { pathToFileURL } from "node:url";
import { diagnostic, layers } from "./diagnostics.mjs";
import { validateAll } from "./validate-all.mjs";

export const validatorVersion = "2.0.0";

const labels = {
  official: "Official OKF Structure",
  references: "Official OKF References",
  extension: "OWA Extension Layer",
  quality: "OWA Quality",
  format: "OWA Formatting",
  internal: "Validator Internal Errors",
};

const usage = "Usage: node tools/okf/cli.mjs validate [--layer official|references|extension|quality|format] [--format human|json] [--remote] [--strict-warnings]";

function parseOptions(args) {
  const config = { layer: undefined, format: "human", remote: false, strictWarnings: false };
  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--layer") {
      const value = args[++index];
      if (!value || !layers.has(value) || value === "internal") throw new Error(`Unknown validation layer '${value ?? ""}'.`);
      config.layer = value;
    } else if (arg === "--format") {
      const value = args[++index];
      if (!value || !["human", "json"].includes(value)) throw new Error(`Unknown output format '${value ?? ""}'.`);
      config.format = value;
    } else if (arg === "--json") config.format = "json";
    else if (arg === "--remote") config.remote = true;
    else if (arg === "--strict-warnings") config.strictWarnings = true;
    else throw new Error(`Unknown argument '${arg}'.`);
  }
  return config;
}

function counts(diagnostics) {
  return {
    errors: diagnostics.filter((item) => item.severity === "error").length,
    warnings: diagnostics.filter((item) => item.severity === "warning").length,
    info: diagnostics.filter((item) => item.severity === "info").length,
  };
}

export function buildJsonReport(report, diagnostics = report.diagnostics, options = {}) {
  const totals = counts(diagnostics);
  const layersReport = {};
  for (const layer of ["official", "references", "extension", "quality", "format", "internal"]) {
    const layerCounts = counts(diagnostics.filter((item) => item.layer === layer));
    layersReport[layer] = { ...layerCounts, result: layerCounts.errors > 0 || (options.strictWarnings && layerCounts.warnings > 0) ? "fail" : "pass" };
  }
  return {
    schemaVersion: "2.0.0",
    validator: { name: "offline-web-archiver-okf", version: validatorVersion },
    okfVersion: "0.2",
    result: totals.errors > 0 || (options.strictWarnings && totals.warnings > 0) ? "fail" : "pass",
    exitCode: totals.errors > 0 || (options.strictWarnings && totals.warnings > 0) ? 1 : 0,
    strictWarnings: Boolean(options.strictWarnings),
    artifacts: report.artifacts.map(({ path, kind }) => ({ path, kind })),
    layers: layersReport,
    referenceChecks: report.referenceChecks ?? [],
    diagnostics,
    errors: totals.errors,
    warnings: totals.warnings,
    info: totals.info,
  };
}

export function buildHumanOutput(diagnostics, layer, options = {}) {
  const groups = layer ? [layer] : ["official", "references", "extension", "quality", "format", "internal"];
  let output = "";
  for (const group of groups) {
    const items = diagnostics.filter((item) => item.layer === group);
    const groupCounts = counts(items);
    const failed = groupCounts.errors > 0 || (options.strictWarnings && groupCounts.warnings > 0);
    output += `${labels[group] ?? group}: ${failed ? "FAIL" : "PASS"} (${groupCounts.errors} error(s), ${groupCounts.warnings} warning(s), ${groupCounts.info} info)\n`;
    for (const item of items) {
      const location = item.file ? `${item.file}${item.line ? `:${item.line}${item.column ? `:${item.column}` : ""}` : ""}` : "<validator>";
      output += `  [${item.severity}] ${item.ruleId} ${location}: ${item.message}${item.suggestion ? ` Suggestion: ${item.suggestion}` : ""}\n`;
    }
  }
  const selected = diagnostics.filter((item) => !layer || item.layer === layer);
  const totals = counts(selected);
  const overallFailed = totals.errors > 0 || (options.strictWarnings && totals.warnings > 0);
  output += `${layer ? "Selected OKF Check" : "Overall Repository OKF Checks"}: ${overallFailed ? "FAIL" : "PASS"}\n`;
  return output;
}

export async function run(args = process.argv.slice(2), dependencies = {}) {
  if (args[0] === "--help" || args[0] === "help") {
    process.stdout.write(`${usage}\n`);
    return 0;
  }
  if (args[0] !== "validate") {
    process.stderr.write(`${usage}\n`);
    return 2;
  }
  let config;
  try { config = parseOptions(args); } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n${usage}\n`);
    return 2;
  }
  let report;
  try {
    report = await (dependencies.validateAll ?? validateAll)(undefined, { onlyLayer: config.layer, remote: config.remote });
  } catch (error) {
    report = { artifacts: [], referenceChecks: [], diagnostics: [diagnostic("internal", "OKF-INTERNAL-UNEXPECTED-EXCEPTION", `Unexpected validator exception: ${error instanceof Error ? error.message : String(error)}.`, "cli", "error", { suggestion: "Fix the internal validator failure; it must not be hidden." })] };
  }
  const selected = config.layer ? report.diagnostics.filter((item) => item.layer === config.layer || item.layer === "internal") : report.diagnostics;
  if (config.format === "json") process.stdout.write(`${JSON.stringify(buildJsonReport(report, selected, config), null, 2)}\n`);
  else process.stdout.write(buildHumanOutput(selected, config.layer, config));
  const totals = counts(selected);
  return totals.errors > 0 || (config.strictWarnings && totals.warnings > 0) ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = await run();
