export const layers = new Set(["official", "references", "extension", "quality", "format", "internal"]);

export function diagnostic(layer, ruleId, message, file = undefined, severity = "error", details = {}) {
  if (!layers.has(layer)) throw new Error(`Unknown diagnostic layer '${layer}'`);
  if (!["error", "warning", "info"].includes(severity)) throw new Error(`Unknown diagnostic severity '${severity}'`);
  return {
    layer,
    severity,
    ruleId,
    code: ruleId,
    ...(file === undefined ? {} : { file }),
    ...(details.line === undefined ? {} : { line: details.line }),
    ...(details.column === undefined ? {} : { column: details.column }),
    message,
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
