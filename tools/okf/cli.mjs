import { pathToFileURL } from "node:url";
import { canonicalLayer, diagnostic, layers } from "./diagnostics.mjs";
import { validateAll } from "./validate-all.mjs";

export const validatorVersion = "3.0.0";
export const specificationVersion = "0.2";
export const specificationRevision = "3fcbb9f828c2f23d109c855ee403c3a4c81f3a96";

const validationLayers = ["official", "references", "provenance", "extension", "quality", "format"];
const labels = {
  official: "Official OKF v0.2 Conformance",
  references: "OWA Reference Integrity",
  provenance: "OWA Provenance Policy",
  extension: "OWA Extension Validation",
  quality: "OWA Quality Validation",
  format: "OWA Format Validation",
  internal: "Internal Validator Failures",
};

const usage = "Usage: node tools/okf/cli.mjs validate [--layer conformance|official|references|provenance|extension|quality|format] [--format human|json] [--remote] [--warnings-as-errors]";

function parseOptions(args) {
  const config = { layer: undefined, format: "human", remote: false, warningsAsErrors: false };
  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--layer") {
      const value = args[++index];
      const normalized = value === "conformance" ? "official" : value;
      if (!normalized || !layers.has(normalized) || normalized === "internal") throw new Error("Unknown validation layer '" + (value ?? "") + "'.");
      config.layer = normalized;
    } else if (arg === "--format") {
      const value = args[++index];
      if (!value || !["human", "json"].includes(value)) throw new Error("Unknown output format '" + (value ?? "") + "'.");
      config.format = value;
    } else if (arg === "--json") config.format = "json";
    else if (arg === "--remote") config.remote = true;
    else if (arg === "--warnings-as-errors" || arg === "--strict-warnings") config.warningsAsErrors = true;
    else if (arg === "--help" || arg === "-h") config.help = true;
    else throw new Error("Unknown argument '" + arg + "'.");
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

function exitCodeFor(diagnostics, warningsAsErrors = false) {
  if (diagnostics.some((item) => item.layer === "internal" && item.severity === "error")) return 3;
  const totals = counts(diagnostics);
  return totals.errors > 0 || (warningsAsErrors && totals.warnings > 0) ? 1 : 0;
}

function requestedLayers(options = {}) {
  return options.requestedLayers ?? (options.layer ? [canonicalLayer(options.layer)] : [...validationLayers]);
}

function warningsBlocking(options = {}) {
  return Boolean(options.warningsAsErrors ?? options.strictWarnings);
}

function layerResult(diagnostics, layer, warningsAsErrors) {
  const layerDiagnostics = diagnostics.filter((item) => item.layer === layer);
  const layerCounts = counts(layerDiagnostics);
  return {
    ...layerCounts,
    result: layerCounts.errors > 0 || (warningsAsErrors && layerCounts.warnings > 0) ? "fail" : "pass",
  };
}

export function buildJsonReport(report, diagnostics = report.diagnostics, options = {}) {
  const selectedLayers = requestedLayers(options);
  const layerResults = {};
  const strictWarnings = warningsBlocking(options);
  for (const layer of selectedLayers) layerResults[layer] = layerResult(diagnostics, layer, strictWarnings);
  if (diagnostics.some((item) => item.layer === "internal")) layerResults.internal = layerResult(diagnostics, "internal", strictWarnings);
  const totals = counts(diagnostics);
  const exitCode = exitCodeFor(diagnostics, strictWarnings);
  const result = exitCode === 0 ? "pass" : "fail";
  const artifacts = report.artifacts.map(({ path, kind }) => ({ path, kind }));
  const referenceChecks = report.referenceChecks ?? [];
  const provenanceChecks = report.provenanceChecks ?? [];
  return {
    schema_version: "3.0.0",
    specification_version: specificationVersion,
    specification_revision: specificationRevision,
    requested_layers: selectedLayers,
    layer_results: layerResults,
    diagnostics,
    counts: totals,
    exit_code: exitCode,
    network_mode: options.remote ? "optional-remote" : "disabled",
    generated_at: options.generatedAt ?? new Date().toISOString(),
    validator: { name: "offline-web-archiver-okf", version: validatorVersion },
    result,
    strict_warnings: strictWarnings,
    artifacts,
    reference_checks: referenceChecks,
    provenance_checks: provenanceChecks,
    errors: totals.errors,
    warnings: totals.warnings,
    info: totals.info,
  };
}

function displayPath(item) {
  return item.path ?? item.file ?? "<validator>";
}

export function buildHumanOutput(diagnostics, layer, options = {}) {
  const selectedLayer = layer === undefined ? undefined : canonicalLayer(layer);
  const groups = selectedLayer ? [selectedLayer] : [...validationLayers, "internal"];
  let output = "";
  for (const group of groups) {
    const items = diagnostics.filter((item) => item.layer === group);
    const groupCounts = counts(items);
    const failed = groupCounts.errors > 0 || (warningsBlocking(options) && groupCounts.warnings > 0);
    output += (labels[group] ?? group) + ": " + (failed ? "FAIL" : "PASS") + " (" + groupCounts.errors + " error(s), " + groupCounts.warnings + " warning(s), " + groupCounts.info + " info)\n";
    for (const item of items) {
      const location = displayPath(item) + (item.line ? ":" + item.line + (item.column ? ":" + item.column : "") : "");
      output += "  [" + item.severity + "] " + item.ruleId + " " + location + ": " + item.message + (item.remediation ? " Remediation: " + item.remediation : "") + "\n";
    }
  }
  const selected = selectedLayer ? diagnostics.filter((item) => item.layer === selectedLayer || item.layer === "internal") : diagnostics;
  const selectedExit = exitCodeFor(selected, warningsBlocking(options));
  output += (selectedLayer ? "Selected Validation Layer" : "Overall Repository OKF Policy") + ": " + (selectedExit === 0 ? "PASS" : "FAIL") + "\n";
  return output;
}

export async function run(args = process.argv.slice(2), dependencies = {}) {
  if (args[0] === "--help" || args[0] === "help" || args.includes("--help") || args.includes("-h")) {
    process.stdout.write(usage + "\n");
    return 0;
  }
  if (args[0] !== "validate") {
    process.stderr.write(usage + "\n");
    return 2;
  }
  let config;
  try { config = parseOptions(args); } catch (error) {
    process.stderr.write((error instanceof Error ? error.message : String(error)) + "\n" + usage + "\n");
    return 2;
  }
  let report;
  try {
    report = await (dependencies.validateAll ?? validateAll)(undefined, { onlyLayer: config.layer, remote: config.remote });
  } catch (error) {
    report = {
      artifacts: [],
      referenceChecks: [],
      provenanceChecks: [],
      diagnostics: [diagnostic("internal", "INTERNAL-UNEXPECTED-EXCEPTION", "Unexpected validator exception: " + (error instanceof Error ? error.message : String(error)) + ".", "cli", "error", { suggestion: "Fix the internal validator failure; it must not be hidden." })],
    };
  }
  const selected = config.layer ? report.diagnostics.filter((item) => item.layer === config.layer || item.layer === "internal") : report.diagnostics;
  const reportOptions = {
    ...config,
    requestedLayers: config.layer ? [config.layer] : validationLayers,
  };
  if (config.format === "json") process.stdout.write(JSON.stringify(buildJsonReport(report, selected, reportOptions), null, 2) + "\n");
  else process.stdout.write(buildHumanOutput(selected, config.layer, config));
  return exitCodeFor(selected, config.warningsAsErrors);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = await run();
