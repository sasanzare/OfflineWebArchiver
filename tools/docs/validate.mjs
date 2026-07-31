import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { repositoryRoot } from "../build/typescript.mjs";
import { repositoryFiles, relative } from "../quality/shared.mjs";

const required = [
  "README.md",
  "HANDOFF.md",
  "docs/architecture/README.md",
  "docs/architecture/SYSTEM_CONTEXT.md",
  "docs/architecture/CONTAINER_ARCHITECTURE.md",
  "docs/architecture/COMPONENT_BOUNDARIES.md",
  "docs/architecture/DEPENDENCY_RULES.md",
  "docs/architecture/PROCESS_AND_TRANSPORT_MODEL.md",
  "docs/architecture/CONTRACT_VERSIONING.md",
  "docs/architecture/ERROR_MODEL.md",
  "docs/architecture/LOGGING_AND_OBSERVABILITY.md",
  "docs/architecture/CONFIGURATION_MODEL.md",
  "docs/architecture/SECURITY_BOUNDARIES.md",
  "docs/architecture/TEST_ARCHITECTURE.md",
  "docs/architecture/SPIKE_PROMOTION_REVIEW.md",
  "docs/project/adr/ADR-001-monorepo-and-workspace-strategy.md",
  "docs/project/adr/ADR-002-production-package-boundaries.md",
  "docs/project/adr/ADR-003-local-application-service-transport-boundary.md",
  "docs/project/adr/ADR-004-versioned-contract-strategy.md",
  "docs/project/adr/ADR-005-typescript-module-and-build-strategy.md",
  "docs/project/adr/ADR-006-runtime-validation-strategy.md",
  "docs/project/adr/ADR-007-logging-and-error-boundary-strategy.md",
  "docs/project/adr/ADR-008-canonical-okf-structure-and-validation.md",
  "okf/knowledge/architecture/PHASE_03_ARCHITECTURE_RECORD.md",
];
const errors = [];
let checkedLinks = 0;
for (const name of required) {
  try {
    await access(path.join(repositoryRoot, name));
  } catch {
    errors.push(`Missing required documentation: ${name}`);
  }
}

const adrSections = ["## Status", "## Context", "## Decision", "## Consequences", "## Alternatives", "## Security Impact", "## Portability Impact", "## Testing Impact", "## Migration Impact", "## Evidence", "## Phase Impact", "## Traceability"];
for (const name of required.filter((value) => value.includes("/ADR-"))) {
  try {
    const text = await readFile(path.join(repositoryRoot, name), "utf8");
    for (const heading of adrSections) {
      if (!text.includes(heading)) errors.push(`${name}: missing ${heading}`);
    }
  } catch {}
}

for (const file of (await repositoryFiles()).filter((value) => value.endsWith(".md"))) {
  const text = await readFile(file, "utf8");
  const pattern = /\[[^\]]*\]\(([^)]+)\)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const raw = match[1].trim().replace(/^<|>$/g, "");
    if (/^(?:https?:|mailto:|#)/i.test(raw)) continue;
    const withoutAnchor = raw.split("#", 1)[0];
    if (withoutAnchor.length === 0) continue;
    checkedLinks += 1;
    let decoded;
    try {
      decoded = decodeURIComponent(withoutAnchor);
    } catch {
      errors.push(`${relative(file)}: invalid URL encoding in Markdown link '${raw}'`);
      continue;
    }
    const target = path.resolve(path.dirname(file), decoded.replaceAll("/", path.sep));
    try {
      await access(target);
    } catch {
      errors.push(`${relative(file)}: broken relative Markdown link '${raw}'`);
    }
  }
}

if (errors.length > 0) {
  process.stderr.write(`${errors.join("\n")}\n`);
  process.exit(1);
}
process.stdout.write(`Documentation validation passed for ${required.length} required artifacts and ${checkedLinks} relative links.\n`);
