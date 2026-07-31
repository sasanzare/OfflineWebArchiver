import { readTextFiles, relative } from "./shared.mjs";

const errors = [];
const extensions = new Set([".ts", ".js", ".mjs", ".cjs", ".json", ".css", ".html"]);
for (const { file, text } of await readTextFiles(extensions)) {
  const name = relative(file);
  if (name.startsWith("spikes/") || name === "package-lock.json") continue;
  if (!text.endsWith("\n")) errors.push(`${name}: missing final newline`);
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  lines.forEach((line, index) => {
    if (/\s+$/.test(line)) errors.push(`${name}:${index + 1}: trailing whitespace`);
    if (line.includes("\t")) errors.push(`${name}:${index + 1}: tab character`);
  });
  if (pathExtension(name) === ".json") {
    try { JSON.parse(text); } catch { errors.push(`${name}: invalid JSON`); }
  }
}
function pathExtension(name) {
  return name.slice(name.lastIndexOf("."));
}
if (errors.length > 0) {
  process.stderr.write(`${errors.join("\n")}\n`);
  process.exit(1);
}
process.stdout.write("Production format checks passed.\n");
