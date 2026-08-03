function scalar(value) {
  const text = value.trim();
  if ((text.startsWith("[") && !text.endsWith("]")) || (text.startsWith("{") && !text.endsWith("}"))) throw new Error("Unclosed YAML collection");
  if (text === "" || text === "null" || text === "~") return null;
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1);
  if (text === "true" || text === "false") return text === "true";
  if (/^-?\d+$/.test(text)) return Number(text);
  if (text.startsWith("[") && text.endsWith("]")) return text.slice(1, -1).split(",").map((part) => scalar(part)).filter((part) => part !== null);
  if (/[*&!]|<<:/.test(text)) throw new Error("YAML anchors, aliases, tags, and merge keys are not supported");
  return text;
}

function parseBlock(lines, start, indent) {
  const map = {}; const list = []; let mode;
  let index = start;
  while (index < lines.length) {
    const raw = lines[index];
    if (raw.trim() === "" || raw.trimStart().startsWith("#")) { index += 1; continue; }
    if (/\t/.test(raw)) throw new Error("Tabs are not allowed in frontmatter");
    const leading = raw.length - raw.trimStart().length;
    if (leading < indent) break;
    if (leading > indent) throw new Error(`Unexpected indentation at line ${index + 1}`);
    const content = raw.trim();
    if (content.startsWith("- ")) {
      if (mode === "map") throw new Error("Cannot mix mappings and sequences");
      mode = "list";
      const item = content.slice(2); const match = /^([^:]+):\s*(.*)$/.exec(item);
      if (match) {
        const value = { [match[1].trim()]: scalar(match[2]) };
        index += 1;
        const nested = parseBlock(lines, index, indent + 2);
        if (nested.index > index && nested.value && !Array.isArray(nested.value)) Object.assign(value, nested.value);
        index = nested.index; list.push(value); continue;
      }
      list.push(scalar(item)); index += 1; continue;
    }
    if (mode === "list") throw new Error("Cannot mix mappings and sequences");
    mode = "map";
    const match = /^([^:]+):\s*(.*)$/.exec(content);
    if (!match) throw new Error(`Invalid mapping at line ${index + 1}`);
    const key = match[1].trim(); if (Object.hasOwn(map, key)) throw new Error(`Duplicate YAML mapping key ${key}`);
    const value = match[2]; index += 1;
    if (value === "") { const nested = parseBlock(lines, index, indent + 2); map[key] = nested.value; index = nested.index; }
    else map[key] = scalar(value);
  }
  return { value: mode === "list" ? list : map, index };
}

export function parseFrontmatter(text) {
  if (!text.startsWith("---\n")) return { metadata: undefined, body: text, error: "Missing opening frontmatter delimiter" };
  const close = text.indexOf("\n---\n", 4);
  if (close < 0) return { metadata: undefined, body: text, error: "Missing closing frontmatter delimiter" };
  try { return { metadata: parseBlock(text.slice(4, close).split("\n"), 0, 0).value, body: text.slice(close + 5) }; }
  catch (error) { return { metadata: undefined, body: text, error: error.message }; }
}
