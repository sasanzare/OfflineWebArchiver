import { parseDocument } from "yaml";

export function normalizeMarkdown(text) {
  return text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
}

export function hasFrontmatter(text) {
  return normalizeMarkdown(text).startsWith("---\n");
}

export function frontmatterSource(text) {
  const normalized = normalizeMarkdown(text);
  if (!normalized.startsWith("---\n")) return undefined;
  const close = normalized.indexOf("\n---\n", 4);
  return close < 0 ? undefined : normalized.slice(4, close);
}

export function parseFrontmatter(text) {
  const normalized = normalizeMarkdown(text);
  if (!normalized.startsWith("---\n")) return { metadata: undefined, body: normalized, error: "Missing opening frontmatter delimiter" };
  const close = normalized.indexOf("\n---\n", 4);
  if (close < 0) return { metadata: undefined, body: normalized, error: "Missing closing frontmatter delimiter" };
  try {
    const document = parseDocument(normalized.slice(4, close), {
      logLevel: "error",
      prettyErrors: false,
      schema: "core",
      strict: true,
      stringKeys: true,
      uniqueKeys: true,
      version: "1.2",
    });
    if (document.errors.length > 0) return { metadata: undefined, body: normalized.slice(close + 5), error: document.errors.map((error) => error.message).join("; ") };
    return { metadata: document.toJS({ maxAliasCount: 100 }), body: normalized.slice(close + 5) };
  } catch (error) {
    return { metadata: undefined, body: normalized.slice(close + 5), error: error instanceof Error ? error.message : "Unknown YAML parse error" };
  }
}
