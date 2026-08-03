export const layers = new Set(["official", "references", "provenance", "extension", "quality", "format", "internal"]);

const layerAliases = new Map([["conformance", "official"]]);

export function canonicalLayer(layer) {
  return layerAliases.get(layer) ?? layer;
}

export function diagnostic(layer, ruleId, message, file = undefined, severity = "error", details = {}) {
  const normalizedLayer = canonicalLayer(layer);
  if (!layers.has(normalizedLayer)) throw new Error(`Unknown diagnostic layer '${layer}'`);
  if (!["error", "warning", "info"].includes(severity)) throw new Error(`Unknown diagnostic severity '${severity}'`);
  return {
    layer: normalizedLayer,
    severity,
    ruleId,
    code: ruleId,
    ...(file === undefined ? {} : { path: file, file }),
    ...(details.line === undefined ? {} : { line: details.line }),
    ...(details.column === undefined ? {} : { column: details.column }),
    message,
    ...(details.remediation === undefined && details.suggestion === undefined ? {} : { remediation: details.remediation ?? details.suggestion }),
    ...(details.suggestion === undefined ? {} : { suggestion: details.suggestion }),
    ...(details.sourceLayer === undefined ? {} : { sourceLayer: details.sourceLayer }),
    ...(details.data === undefined ? {} : { data: details.data }),
  };
}

function compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function sortDiagnostics(items) {
  return [...items].sort((left, right) => {
    const leftKey = [left.file ?? "", left.layer, left.ruleId ?? left.code ?? "", left.message ?? ""].join("\0");
    const rightKey = [right.file ?? "", right.layer, right.ruleId ?? right.code ?? "", right.message ?? ""].join("\0");
    return compare(leftKey, rightKey);
  });
}
