import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const spikeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rootPackage = JSON.parse(await readFile(path.join(spikeRoot, "package.json"), "utf8"));
const lock = JSON.parse(await readFile(path.join(spikeRoot, "package-lock.json"), "utf8"));
const directRuntime = new Set(Object.keys(rootPackage.dependencies ?? {}));
const directDevelopment = new Set(Object.keys(rootPackage.devDependencies ?? {}));
const purposes = new Map([
  ["playwright", "Browser automation and the managed Chromium contract"],
  ["electron", "Desktop runtime and renderer isolation proof"],
  ["electron-builder", "Experimental Windows directory packaging"],
  ["typescript", "Strict local compilation and type checking"],
  ["@types/node", "Node.js 24 development type definitions"],
]);

async function hasLicenseFile(packageDirectory) {
  try {
    const entries = await readdir(packageDirectory);
    return entries.some((entry) => /^(licen[cs]e|copying|notice)(\.|$)/i.test(entry));
  } catch {
    return false;
  }
}

const rows = [];
for (const [lockPath, entry] of Object.entries(lock.packages ?? {})) {
  if (lockPath === "" || !lockPath.includes("node_modules/")) continue;
  const packageDirectory = path.join(spikeRoot, lockPath.split("/").join(path.sep));
  let installed;
  try {
    installed = JSON.parse(await readFile(path.join(packageDirectory, "package.json"), "utf8"));
  } catch {
    continue;
  }
  const name = installed.name;
  const direct = directRuntime.has(name) || directDevelopment.has(name);
  const development = directDevelopment.has(name) || entry.dev === true;
  const electronRuntime = name === "electron";
  rows.push({
    name,
    version: installed.version ?? entry.version ?? "UNKNOWN",
    purpose: purposes.get(name) ?? "Transitive dependency of the experimental toolchain",
    classification: development ? "Development" : "Runtime",
    license: typeof installed.license === "string"
      ? installed.license
      : installed.license?.type ?? entry.license ?? "UNKNOWN",
    dependency: direct ? "Direct" : "Transitive",
    packaged: !development
      ? "Yes — application dependency"
      : electronRuntime
        ? "Yes — Electron runtime produced by builder"
        : "No — build/test dependency",
    decision: "Experimental only; production decision remains open",
    concern: name === "playwright"
      ? "Pinned below current because newer browser artifacts were unavailable in this location; not a production security baseline"
      : name === "electron-builder"
        ? "Final npm audit reported zero findings; build-only dependency still requires production review"
        : direct
          ? "Pinned; review again before any production adoption"
          : "Not individually security-reviewed for production",
    source: await hasLicenseFile(packageDirectory)
      ? "Installed package metadata + license/notice file present"
      : "Installed package metadata only; license text not found at package root",
  });
}

rows.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
const header = `# Dependency Inventory — Product Phase 2 Spike

**Generated:** 2026-07-31  
**Scope:** experimental package under \`spikes/phase-02-feasibility/\`  
**Production decision:** not finalized

This inventory is generated from the committed lockfile and installed package
metadata by \`npm run dependencies:report\`. “License/notice file present” means
the generator found a likely text in the installed package root; it is not a legal
approval. Direct package license texts were inspected separately for the Phase 2
report. Transitive packages require a release-grade license review before any
production distribution.

| Package | Exact version | Purpose | Classification | License | Direct/transitive | Included in packaged artifact | Production-decision status | Security/maintenance concern | License source inspected |
|---|---:|---|---|---|---|---|---|---|---|
`;
const body = rows.map((row) =>
  `| \`${row.name.replaceAll("|", "\\|")}\` | ${row.version} | ${row.purpose} | ${row.classification} | ${String(row.license).replaceAll("|", "\\|")} | ${row.dependency} | ${row.packaged} | ${row.decision} | ${row.concern} | ${row.source} |`,
).join("\n");
const footer = `

## Direct dependency rationale

- \`playwright\` is the only application dependency because the packaged main
  process loads it at runtime.
- \`electron\`, \`electron-builder\`, \`typescript\`, and \`@types/node\` are
  development dependencies. electron-builder nevertheless produces the Electron
  runtime in the packaged directory.
- No dependency choice is approved for Product Phase 3 or later.

## Security audit snapshot

- \`npm audit --omit=dev\`: zero vulnerabilities on 2026-07-31.
- \`npm audit\`: zero vulnerabilities on 2026-07-31.
- No automatic or forced dependency upgrade was applied.
- Playwright Chromium 141.0.7390.37 is an experimental compatibility artifact,
  not an approved production browser security baseline.

## Direct license-source inspection

Installed package metadata and license files were inspected for Electron,
Playwright, playwright-core, electron-builder, TypeScript, and \`@types/node\`.
Electron's packaged \`LICENSE.electron.txt\`, Chromium's
\`LICENSES.chromium.html\`, and this spike's \`THIRD_PARTY_NOTICES.md\` were also
confirmed in the unpacked package. This is inventory evidence, not legal
approval or a complete transitive redistribution review.
`;
await writeFile(path.join(spikeRoot, "DEPENDENCIES.md"), `${header}${body}${footer}`, "utf8");
process.stdout.write(`Generated DEPENDENCIES.md with ${rows.length} installed package rows.\n`);
