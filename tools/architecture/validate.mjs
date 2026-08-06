import { readFile } from "node:fs/promises";
import path from "node:path";
import { repositoryFiles, relative } from "../quality/shared.mjs";
import { repositoryRoot } from "../build/typescript.mjs";

const sourceFiles = (await repositoryFiles()).filter(
  (file) => file.endsWith(".ts") && !relative(file).startsWith("spikes/"),
);
const errors = [];

const packageRules = new Map([
  ["packages/contracts/", new Set(["zod"])],
  ["packages/archive-core/", new Set()],
  ["packages/browser-runtime/", new Set([
    "node:crypto",
    "node:fs/promises",
    "node:path",
    "playwright-core",
    "@offline-web-archive/archive-core",
  ])],
  ["packages/rendering/", new Set(["@offline-web-archive/archive-core"])],
  ["packages/queue/", new Set(["@offline-web-archive/archive-core"])],
  ["packages/recovery/", new Set(["@offline-web-archive/archive-core"])],
  ["packages/scope-engine/", new Set(["node:crypto", "node:url", "tldts", "zod"])],
  ["packages/project-format/", new Set(["zod"])],
  ["packages/persistence-sqlite/", new Set([
    "node:crypto",
    "node:fs",
    "node:fs/promises",
    "node:os",
    "node:path",
    "node:sqlite",
    "@offline-web-archive/archive-core",
    "@offline-web-archive/observability",
    "@offline-web-archive/project-format",
    "@offline-web-archive/queue",
    "@offline-web-archive/recovery",
    "@offline-web-archive/scope-engine",
    "fflate",
  ])],
  ["packages/observability/", new Set()],
  ["packages/secrets/", new Set([
    "node:crypto",
    "node:fs",
    "node:fs/promises",
    "node:path",
    "@offline-web-archive/archive-core",
    "@offline-web-archive/observability",
    "fflate",
  ])],
  ["packages/platform/", new Set(["@offline-web-archive/contracts"])],
  ["packages/application-service/", new Set([
    "node:dns/promises",
    "node:path",
    "@offline-web-archive/archive-core",
    "@offline-web-archive/browser-runtime",
    "@offline-web-archive/contracts",
    "@offline-web-archive/observability",
    "@offline-web-archive/persistence-sqlite",
    "@offline-web-archive/queue",
    "@offline-web-archive/scope-engine",
    "@offline-web-archive/rendering",
    "@offline-web-archive/secrets",
  ])],
  ["packages/test-support/", new Set([
    "@offline-web-archive/contracts",
    "@offline-web-archive/observability",
  ])],
  ["apps/cli/", new Set([
    "node:crypto",
    "node:fs/promises",
    "node:url",
    "@offline-web-archive/application-service",
    "@offline-web-archive/contracts",
    "@offline-web-archive/observability",
    "@offline-web-archive/platform",
    "@offline-web-archive/scope-engine",
  ])],
  ["apps/desktop/src/renderer/", new Set(["@offline-web-archive/contracts"])],
  ["apps/desktop/src/preload/", new Set([
    "electron",
    "@offline-web-archive/contracts",
  ])],
  ["apps/desktop/src/main/", new Set([
    "node:crypto",
    "node:path",
    "node:url",
    "electron",
    "@offline-web-archive/application-service",
    "@offline-web-archive/contracts",
    "@offline-web-archive/observability",
    "@offline-web-archive/platform",
    "@offline-web-archive/secrets",
  ])],
]);

function importsFrom(text) {
  const values = [];
  const pattern = /(?:from\s+|import\s*\()\s*["']([^"']+)["']/g;
  let match;
  while ((match = pattern.exec(text)) !== null) values.push(match[1]);
  return values;
}

for (const file of sourceFiles) {
  const name = relative(file);
  if (name.startsWith("tests/")) continue;
  const text = await readFile(file, "utf8");
  const rule = [...packageRules].find(([prefix]) => name.startsWith(prefix));
  if (rule === undefined) continue;
  const [, allowed] = rule;
  for (const specifier of importsFrom(text)) {
    if (specifier.startsWith(".")) continue;
    if (!allowed.has(specifier)) {
      errors.push(`${name}: import '${specifier}' crosses the declared boundary`);
    }
  }
  if (name.startsWith("packages/") && /(?:from\s+|import\s*\()\s*["'](?:\.\.\/)+\.\.\/apps\//.test(text)) {
    errors.push(`${name}: production packages must not depend on apps`);
  }
}

const manifests = [
  "packages/contracts/package.json",
  "packages/archive-core/package.json",
  "packages/browser-runtime/package.json",
  "packages/rendering/package.json",
  "packages/queue/package.json",
  "packages/recovery/package.json",
  "packages/scope-engine/package.json",
  "packages/project-format/package.json",
  "packages/persistence-sqlite/package.json",
  "packages/observability/package.json",
  "packages/secrets/package.json",
  "packages/platform/package.json",
  "packages/application-service/package.json",
  "packages/test-support/package.json",
  "apps/cli/package.json",
  "apps/desktop/package.json",
];
const workspaceGraph = new Map();
for (const manifest of manifests) {
  const value = JSON.parse(await readFile(path.join(repositoryRoot, manifest), "utf8"));
  const dependencies = Object.keys(value.dependencies ?? {});
  workspaceGraph.set(value.name, dependencies.filter((name) => name.startsWith("@offline-web-archive/")));
  if (manifest.startsWith("packages/") && dependencies.some((name) => name.endsWith("/desktop") || name.endsWith("/cli"))) {
    errors.push(`${manifest}: package manifest depends on an application`);
  }
  if (value.name !== "@offline-web-archive/test-support" && dependencies.includes("@offline-web-archive/test-support")) {
    errors.push(`${manifest}: test-support leaked into a runtime dependency graph`);
  }
  if (dependencies.some((name) => name.includes("spike"))) {
    errors.push(`${manifest}: spike code appears in the production dependency graph`);
  }
  if (manifest.startsWith("packages/") && (value.exports?.["."]?.import !== "./dist/index.js" || value.exports?.["."]?.types !== "./dist/index.d.ts")) {
    errors.push(`${manifest}: public package entry point is incomplete`);
  }
}

const visiting = new Set();
const visited = new Set();
function visit(name, trail = []) {
  if (visiting.has(name)) {
    errors.push(`workspace dependency cycle: ${[...trail, name].join(" -> ")}`);
    return;
  }
  if (visited.has(name)) return;
  visiting.add(name);
  for (const dependency of workspaceGraph.get(name) ?? []) visit(dependency, [...trail, name]);
  visiting.delete(name);
  visited.add(name);
}
for (const name of workspaceGraph.keys()) visit(name);

const queueDomainSource = await readFile(path.join(repositoryRoot, "packages", "queue", "src", "index.ts"), "utf8");
for (const forbidden of ["node:sqlite", "electron", "apps/cli", "playwright", "chromium"]) {
  if (queueDomainSource.toLowerCase().includes(forbidden.toLowerCase())) errors.push(`queue domain: forbidden dependency '${forbidden}'`);
}

const desktopSource = await readFile(
  path.join(repositoryRoot, "apps", "desktop", "src", "main", "index.ts"),
  "utf8",
);
for (const setting of [
  "contextIsolation: true",
  "nodeIntegration: false",
  "sandbox: true",
  "webSecurity: true",
]) {
  if (!desktopSource.includes(setting)) errors.push(`desktop main: missing ${setting}`);
}

if (errors.length > 0) {
  process.stderr.write(`${errors.join("\n")}\n`);
  process.exit(1);
}
process.stdout.write(`Architecture boundaries passed for ${sourceFiles.length} production TypeScript files.\n`);
