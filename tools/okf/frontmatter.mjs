import { parseDocument } from "yaml";

export function normalizeMarkdown(text) {
  return text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
}

export function hasFrontmatter(text) {
  return /^---(?:\n|$)/.test(normalizeMarkdown(text));
}

function frontmatterMatch(text) {
  const normalized = normalizeMarkdown(text);
  if (!/^---\n/.test(normalized)) return undefined;
  return /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(normalized);
}

export function frontmatterSource(text) {
  return frontmatterMatch(text)?.[1];
}

export function parseFrontmatter(text) {
  const normalized = normalizeMarkdown(text);
  if (!/^---\n/.test(normalized)) return { metadata: undefined, body: normalized, error: "Missing opening frontmatter delimiter", line: 1, column: 1 };
  const match = frontmatterMatch(normalized);
  if (!match) return { metadata: undefined, body: normalized, error: "Missing closing frontmatter delimiter", line: 1, column: 1 };
  const source = match[1];
  const body = normalized.slice(match[0].length);
  try {
    const document = parseDocument(source, {
      logLevel: "error",
      prettyErrors: false,
      schema: "core",
      strict: true,
      stringKeys: true,
      uniqueKeys: true,
      version: "1.2",
    });
    if (document.errors.length > 0) return { metadata: undefined, body, error: document.errors.map((error) => error.message).join("; "), line: 2, column: 1 };
    return { metadata: document.toJS({ maxAliasCount: 100 }), body, line: source.split("\n").length + 2, column: 1 };
  } catch (error) {
    return { metadata: undefined, body, error: error instanceof Error ? error.message : "Unknown YAML parse error", line: 2, column: 1 };
  }
}
