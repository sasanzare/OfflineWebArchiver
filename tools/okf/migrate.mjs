import { access } from "node:fs/promises";
import path from "node:path";
import { repositoryRoot } from "../build/typescript.mjs";
import { validateOkf } from "./validate.mjs";

const prerequisites = [
  "okf-bootstrap/MIGRATION_AND_ACTIVATION_PLAN.md",
  "okf-bootstrap/PHASE_EVOLUTION_CONTRACT.md",
  "okf-bootstrap/STATUS_MODEL.md",
  "okf-bootstrap/EVIDENCE_POLICY.md",
  "docs/product/PROJECT_SCOPE.md",
  "docs/product/ACCEPTANCE_MATRIX.md",
  "docs/project/RISK_REGISTER.md",
  "docs/project/OPEN_DECISIONS.md",
  "docs/project/PHASE_02_FEASIBILITY_REPORT.md",
  "docs/architecture/README.md",
  "package.json",
  "packages/contracts/src/index.ts",
];

function missingPrerequisites(available) {
  return prerequisites.filter((source) => !available.has(source));
}

if (process.argv.includes("--self-test")) {
  for (const omitted of prerequisites) {
    const available = new Set(prerequisites.filter((source) => source !== omitted));
    if (!missingPrerequisites(available).includes(omitted)) {
      throw new Error(`Migration prerequisite negative probe failed for ${omitted}`);
    }
  }
  process.stdout.write(`OKF migration prerequisite self-tests passed for ${prerequisites.length} absent-input cases.\n`);
}

const available = new Set();
for (const source of prerequisites) {
  try {
    await access(path.join(repositoryRoot, source));
    available.add(source);
  } catch {}
}
const missing = missingPrerequisites(available);
if (missing.length > 0) {
  process.stderr.write(`Migration blocked by missing prerequisite(s):\n- ${missing.join("\n- ")}\n`);
  process.exit(1);
}
const errors = await validateOkf();
if (errors.length > 0) {
  process.stderr.write(`Migration verification failed; canonical files are never repaired silently:\n- ${errors.join("\n- ")}\n`);
  process.exit(1);
}
process.stdout.write("Bootstrap-preserving OKF migration is materialized and validates without repair.\n");
