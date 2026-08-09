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
  "docs/architecture/PROJECT_FORMAT.md",
  "docs/architecture/SQLITE_PERSISTENCE.md",
  "docs/architecture/MIGRATION_STRATEGY.md",
  "docs/architecture/ATOMIC_FILE_OPERATIONS.md",
  "docs/architecture/PROJECT_IMPORT_EXPORT.md",
  "docs/architecture/PROJECT_LOCKING.md",
  "docs/architecture/PORTABLE_PATH_RULES.md",
  "docs/architecture/PROJECT_LIFECYCLE.md",
  "docs/architecture/PHASE_04_SECURITY_REVIEW.md",
  "docs/architecture/SITE_PROFILE.md",
  "docs/architecture/URL_NORMALIZATION.md",
  "docs/architecture/SCOPE_ENGINE.md",
  "docs/architecture/DOMAIN_AND_ORIGIN_POLICY.md",
  "docs/architecture/PATH_SCOPE_RULES.md",
  "docs/architecture/QUERY_AND_FRAGMENT_POLICY.md",
  "docs/architecture/CANONICAL_AND_REDIRECT_POLICY.md",
  "docs/architecture/URL_IDENTITY_AND_DEDUPLICATION.md",
  "docs/architecture/SSRF_PREPARATION.md",
  "docs/architecture/PHASE_05_SECURITY_REVIEW.md",
  "docs/architecture/PERSISTENT_QUEUE.md",
  "docs/architecture/JOB_STATE_MACHINE.md",
  "docs/architecture/JOB_IDENTITY_AND_DEDUPLICATION.md",
  "docs/architecture/QUEUE_ORDERING_AND_PRIORITY.md",
  "docs/architecture/JOB_ATTEMPTS_AND_RETRY.md",
  "docs/architecture/QUEUE_IDEMPOTENCY.md",
  "docs/architecture/QUEUE_CONCURRENCY.md",
  "docs/architecture/DISCOVERY_RELATIONSHIPS.md",
  "docs/architecture/QUEUE_PERSISTENCE.md",
  "docs/architecture/PHASE_06_SECURITY_REVIEW.md",
  "docs/architecture/JOB_LEASES.md",
  "docs/architecture/HEARTBEATS_AND_FENCING.md",
  "docs/architecture/CHECKPOINT_MODEL.md",
  "docs/architecture/CRASH_RECOVERY.md",
  "docs/architecture/PAUSE_AND_RESUME.md",
  "docs/architecture/RUN_CONTROL_STATE.md",
  "docs/architecture/RECOVERY_OPERATIONS.md",
  "docs/architecture/COMPLETED_OUTPUT_VERIFICATION.md",
  "docs/architecture/PARTIAL_FILE_RECOVERY.md",
  "docs/architecture/RECOVERY_CONCURRENCY.md",
  "docs/architecture/PHASE_07_SECURITY_REVIEW.md",
  "docs/architecture/BROWSER_RUNTIME.md",
  "docs/architecture/BROWSER_LIFECYCLE.md",
  "docs/architecture/RENDERING_ENGINE.md",
  "docs/architecture/RENDER_STABILITY.md",
  "docs/architecture/RUNTIME_NETWORK_POLICY.md",
  "docs/architecture/RENDER_RESULTS.md",
  "docs/architecture/PERFORMANCE_BASELINE.md",
  "docs/architecture/PHASE_08_SECURITY_REVIEW.md",
  "docs/architecture/BROWSER_INTERACTION.md",
  "docs/architecture/PHASE_10_SECURITY_REVIEW.md",
  "docs/architecture/SECRET_STORE.md",
  "docs/architecture/CREDENTIAL_REFERENCES.md",
  "docs/architecture/PORTABLE_VAULT.md",
  "docs/architecture/SECRET_CRYPTOGRAPHY.md",
  "docs/architecture/SECRET_KEY_HIERARCHY.md",
  "docs/architecture/SECRET_OS_STORAGE.md",
  "docs/architecture/SECRET_LOGGING_AND_REDACTION.md",
  "docs/architecture/SECRET_EXPORT_AND_DIAGNOSTICS.md",
  "docs/architecture/SECRET_TEMPORARY_DATA.md",
  "docs/architecture/PHASE_11_SECURITY_REVIEW.md",
  "docs/architecture/TRUST_ZONES_AND_IPC.md",
  "docs/architecture/NETWORK_REPLAY.md",
  "docs/architecture/STRICT_OFFLINE_MODE.md",
  "docs/architecture/SERVICE_WORKER_POLICY.md",
  "docs/architecture/CANONICAL_PATH_SAFETY.md",
  "docs/architecture/WORKER_NETWORK_CONCURRENCY_CONTRACT.md",
  "docs/architecture/SQLITE_CONCURRENCY_STRESS_PLAN.md",
  "docs/architecture/PLATFORM_SUPPORT_POLICY.md",
  "docs/architecture/ACCEPTANCE_METRICS.md",
  "docs/architecture/PHASE_13_SECURITY_REVIEW.md",
  "docs/project/PHASE_04_IMPLEMENTATION_REPORT.md",
  "docs/project/PHASE_05_IMPLEMENTATION_REPORT.md",
  "docs/project/PHASE_06_IMPLEMENTATION_REPORT.md",
  "docs/project/PHASE_07_IMPLEMENTATION_REPORT.md",
  "docs/project/PHASE_08_IMPLEMENTATION_REPORT.md",
  "docs/project/PHASE_10_IMPLEMENTATION_REPORT.md",
  "docs/project/PHASE_11_IMPLEMENTATION_REPORT.md",
  "docs/project/PHASE_13_IMPLEMENTATION_REPORT.md",
  "docs/project/adr/ADR-001-monorepo-and-workspace-strategy.md",
  "docs/project/adr/ADR-002-production-package-boundaries.md",
  "docs/project/adr/ADR-003-local-application-service-transport-boundary.md",
  "docs/project/adr/ADR-004-versioned-contract-strategy.md",
  "docs/project/adr/ADR-005-typescript-module-and-build-strategy.md",
  "docs/project/adr/ADR-006-runtime-validation-strategy.md",
  "docs/project/adr/ADR-007-logging-and-error-boundary-strategy.md",
  "docs/project/adr/ADR-008-canonical-okf-structure-and-validation.md",
  "docs/project/adr/ADR-009-versioned-portable-project-format.md",
  "docs/project/adr/ADR-010-node-sqlite-persistence-adapter.md",
  "docs/project/adr/ADR-011-forward-only-sqlite-migrations.md",
  "docs/project/adr/ADR-012-atomic-project-file-replacement.md",
  "docs/project/adr/ADR-013-bounded-zip-project-export.md",
  "docs/project/adr/ADR-014-single-writer-project-lock.md",
  "docs/project/adr/ADR-015-portable-site-profile-authority.md",
  "docs/project/adr/ADR-016-versioned-url-normalization-and-identity.md",
  "docs/project/adr/ADR-017-domain-matching-and-public-suffix.md",
  "docs/project/adr/ADR-018-query-and-fragment-classification.md",
  "docs/project/adr/ADR-019-scope-precedence-and-limits.md",
  "docs/project/adr/ADR-020-canonical-and-redirect-classification.md",
  "docs/project/adr/ADR-021-scope-engine-versioning.md",
  "docs/project/adr/ADR-022-private-network-preflight.md",
  "docs/project/adr/ADR-023-page-job-logical-identity.md",
  "docs/project/adr/ADR-024-persistent-queue-schema.md",
  "docs/project/adr/ADR-025-job-state-machine.md",
  "docs/project/adr/ADR-026-atomic-sqlite-job-claim.md",
  "docs/project/adr/ADR-027-queue-ordering-and-priority.md",
  "docs/project/adr/ADR-028-queue-idempotency-strategy.md",
  "docs/project/adr/ADR-029-attempt-and-retry-foundation.md",
  "docs/project/adr/ADR-030-discovery-relationship-storage.md",
  "docs/project/adr/ADR-031-persistent-job-leases.md",
  "docs/project/adr/ADR-032-monotonic-fencing-generation.md",
  "docs/project/adr/ADR-033-heartbeat-renewal-and-expiration.md",
  "docs/project/adr/ADR-034-recovery-state-transitions.md",
  "docs/project/adr/ADR-035-checkpoint-storage-and-versioning.md",
  "docs/project/adr/ADR-036-run-pause-and-resume-semantics.md",
  "docs/project/adr/ADR-037-recovery-ownership-and-batching.md",
  "docs/project/adr/ADR-038-completed-output-verification.md",
  "docs/project/adr/ADR-039-partial-file-recovery-foundation.md",
  "docs/project/adr/ADR-040-clock-abstraction.md",
  "docs/project/adr/ADR-041-pinned-playwright-chromium-runtime.md",
  "docs/project/adr/ADR-042-single-browser-process-one-active-job.md",
  "docs/project/adr/ADR-043-isolated-context-per-job.md",
  "docs/project/adr/ADR-044-combined-dom-network-stability.md",
  "docs/project/adr/ADR-045-cdp-runtime-network-authorization.md",
  "docs/project/adr/ADR-046-fenced-artifact-first-render-commit.md",
  "docs/project/adr/ADR-047-opt-in-bounded-render-screenshot.md",
  "docs/project/adr/ADR-048-browser-and-page-crash-recovery.md",
  "docs/project/adr/ADR-049-browser-native-human-paced-interaction.md",
  "docs/project/adr/ADR-050-secret-store-and-sensitive-data-protection.md",
  "docs/project/adr/ADR-052-trust-zones-and-privilege-boundaries.md",
  "docs/project/adr/ADR-053-separated-crawl-run-state.md",
  "docs/project/adr/ADR-054-network-replay-and-strict-offline-contract.md",
  "docs/project/adr/ADR-055-versioned-service-worker-policy.md",
  "docs/project/adr/ADR-056-canonical-path-safety.md",
  "okf/history/phase-03.md",
  "okf/history/phase-04.md",
  "okf/history/phase-05.md",
  "okf/history/phase-06.md",
  "okf/history/phase-07.md",
  "okf/history/phase-08.md",
  "okf/history/phase-10.md",
  "okf/history/phase-11.md",
  "okf/workflow/queue.md",
  "okf/workflow/job-state-machine.md",
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
const phaseFiveAdrSections = ["## Persistence Impact", "## Related Requirements", "## Related Acceptance Criteria", "## Related Risks", "## Related Open Decisions", "## Related OKF Domains"];
const phaseSixAdrSections = [
  "## Status",
  "## Context",
  "## Decision",
  "## Alternatives",
  "## Consequences",
  "## Security Impact",
  "## Reliability Impact",
  "## Concurrency Impact",
  "## Persistence Impact",
  "## Migration Impact",
  "## Testing Impact",
  "## Related Requirements",
  "## Related Acceptance Criteria",
  "## Related Risks",
  "## Related Open Decisions",
  "## Related OKF Domains",
];
const phaseSevenAdrSections = [
  ...phaseSixAdrSections,
  "## Portability Impact",
];
for (const name of required.filter((value) => value.includes("/ADR-"))) {
  try {
    const text = await readFile(path.join(repositoryRoot, name), "utf8");
    const headings = /^docs\/project\/adr\/ADR-0(?:31|32|33|34|35|36|37|38|39|40|41|42|43|44|45|46|47|48)-/.test(name)
      ? phaseSevenAdrSections
      : /^docs\/project\/adr\/ADR-0(?:23|24|25|26|27|28|29|30)-/.test(name)
        ? phaseSixAdrSections
      : /^docs\/project\/adr\/ADR-0(?:15|16|17|18|19|20|21|22)-/.test(name)
        ? [...adrSections, ...phaseFiveAdrSections]
        : adrSections;
    for (const heading of headings) {
      if (!text.includes(heading)) errors.push(`${name}: missing ${heading}`);
    }
  } catch {}
}

const markdownFiles = (await repositoryFiles()).filter((value) => value.endsWith(".md") && !relative(value).startsWith("tests/okf/fixtures/"));
const archivePrefix = "docs/archive/okf/";
const archivedMarkdownFiles = markdownFiles.filter((value) => relative(value).startsWith(archivePrefix));
for (const file of markdownFiles) {
  const text = await readFile(file, "utf8");
  // Archived OKF records are read for UTF-8/readability, but their historical
  // links may intentionally point to superseded paths and are not active docs.
  if (relative(file).startsWith(archivePrefix)) continue;
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
process.stdout.write(`Documentation validation passed for ${required.length} required artifacts, ${checkedLinks} active relative links, and ${archivedMarkdownFiles.length} readable archived Markdown files.\n`);
