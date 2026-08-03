export const layers = new Set(["official", "policy", "extension", "quality", "format", "internal"]);

export function diagnostic(layer, code, message, file, severity = "error") {
  if (!layers.has(layer)) throw new Error(`Unknown diagnostic layer '${layer}'`);
  return { layer, code, message, file, severity };
}

export function sortDiagnostics(items) {
  return [...items].sort((left, right) =>
    [left.file ?? "", left.layer, left.code, left.message].join("\0").localeCompare(
      [right.file ?? "", right.layer, right.code, right.message].join("\0"),
      "en",
      { sensitivity: "variant" },
    ),
  );
}
