import { readTextFiles, relative } from "./shared.mjs";

const errors = [];
for (const { file, text } of await readTextFiles(new Set([".ts", ".js", ".mjs", ".cjs"]))) {
  const name = relative(file);
  if (name.startsWith("spikes/")) continue;
  const rules = [
    [/\beval\s*\(/, "dynamic eval is forbidden"],
    [/new\s+Function\s*\(/, "dynamic Function construction is forbidden"],
    [/@ts-(?:ignore|nocheck)/, "TypeScript suppression is forbidden"],
  ];
  if (name !== "tools/quality/lint.mjs") {
    rules.push([/\bTODO\b/, "untracked TODO marker is forbidden"]);
  }
  if (name.endsWith(".ts")) {
    rules.push([/from\s+["'][.]{1,2}\/[^"']+(?<!\.js)["']/, "relative TypeScript imports must use emitted .js extensions"]);
  }
  for (const [pattern, message] of rules) {
    if (pattern.test(text)) errors.push(`${name}: ${message}`);
  }
}
if (errors.length > 0) {
  process.stderr.write(`${errors.join("\n")}\n`);
  process.exit(1);
}
process.stdout.write("Production source lint checks passed.\n");
