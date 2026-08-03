# Phase 8 Artifact Classification

Audit date: 2026-08-03

Independent disk enumeration was reconciled with validator discovery. Every retained artifact has exactly one classification; no unknown, transitional, deprecated, or log artifact remains.

| Path | Format | Final classification | Authority and retention |
|---|---|---|---|
| `okf/architecture/application-service.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/architecture/browser-runtime.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/architecture/cli.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/architecture/contracts.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/architecture/desktop-interface.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/architecture/index.md` | `.md` | Directory index | Navigation authority; retain |
| `okf/architecture/platform.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/data/database.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/data/index.md` | `.md` | Directory index | Navigation authority; retain |
| `okf/data/persistence.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/data/project-format.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/data/render-results.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/extensions/evidence/builds.md` | `.md` | Extension documentation | Project-specific explanatory or historical view; retain |
| `okf/extensions/evidence/decisions.md` | `.md` | Extension documentation | Project-specific explanatory or historical view; retain |
| `okf/extensions/evidence/runtime.md` | `.md` | Extension documentation | Project-specific explanatory or historical view; retain |
| `okf/extensions/evidence/source.md` | `.md` | Extension documentation | Project-specific explanatory or historical view; retain |
| `okf/extensions/evidence/tests.md` | `.md` | Extension documentation | Project-specific explanatory or historical view; retain |
| `okf/extensions/maps/dependencies.md` | `.md` | Extension documentation | Project-specific explanatory or historical view; retain |
| `okf/extensions/maps/domains.md` | `.md` | Extension documentation | Project-specific explanatory or historical view; retain |
| `okf/extensions/maps/system.md` | `.md` | Extension documentation | Project-specific explanatory or historical view; retain |
| `okf/extensions/maps/traceability.md` | `.md` | Extension documentation | Project-specific explanatory or historical view; retain |
| `okf/extensions/README.md` | `.md` | Extension documentation | Project-specific explanatory or historical view; retain |
| `okf/extensions/reports/decisions.md` | `.md` | Extension documentation | Project-specific explanatory or historical view; retain |
| `okf/extensions/reports/evidence.md` | `.md` | Extension documentation | Project-specific explanatory or historical view; retain |
| `okf/extensions/reports/risks.md` | `.md` | Extension documentation | Project-specific explanatory or historical view; retain |
| `okf/extensions/validation/reports/phase-03-migration-report.md` | `.md` | Extension documentation | Project-specific explanatory or historical view; retain |
| `okf/extensions/validation/rules/semantic-rules.md` | `.md` | Extension documentation | Project-specific explanatory or historical view; retain |
| `okf/history/index.md` | `.md` | Directory index | Navigation authority; retain |
| `okf/history/phase-01.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/history/phase-02.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/history/phase-03.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/history/phase-04.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/history/phase-05.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/history/phase-06.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/history/phase-07.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/history/phase-08.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/index.md` | `.md` | Root index | Navigation authority; retain |
| `okf/manifest.json` | `.json` | Manifest | Authored extension configuration; retain |
| `okf/operations/index.md` | `.md` | Directory index | Navigation authority; retain |
| `okf/operations/migration.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/operations/observability.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/operations/packaging.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/product/index.md` | `.md` | Directory index | Navigation authority; retain |
| `okf/product/overview.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/recovery/artifact-checkpoints.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/recovery/checkpoint-recovery.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/recovery/completed-output.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/recovery/fencing.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/recovery/heartbeats.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/recovery/index.md` | `.md` | Directory index | Navigation authority; retain |
| `okf/recovery/leases.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/recovery/partial-files.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/recovery/pause-resume.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/recovery/run-control.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/registry/changes.json` | `.json` | Registry | Authored or derived extension data; retain |
| `okf/registry/decisions.json` | `.json` | Registry | Authored or derived extension data; retain |
| `okf/registry/domains.json` | `.json` | Registry | Authored or derived extension data; retain |
| `okf/registry/evidence.json` | `.json` | Registry | Authored or derived extension data; retain |
| `okf/registry/nodes.json` | `.json` | Registry | Authored or derived extension data; retain |
| `okf/registry/phases.json` | `.json` | Registry | Authored or derived extension data; retain |
| `okf/registry/relationships.json` | `.json` | Registry | Authored or derived extension data; retain |
| `okf/registry/risks.json` | `.json` | Registry | Authored or derived extension data; retain |
| `okf/security/index.md` | `.md` | Directory index | Navigation authority; retain |
| `okf/security/runtime-network.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/security/security-boundaries.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/testing/index.md` | `.md` | Directory index | Navigation authority; retain |
| `okf/testing/test-strategy.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/validation/schemas/manifest.schema.json` | `.json` | Schema | Authored extension validation schema; retain |
| `okf/validation/schemas/registry.schema.json` | `.json` | Schema | Authored extension validation schema; retain |
| `okf/workflow/index.md` | `.md` | Directory index | Navigation authority; retain |
| `okf/workflow/job-attempts.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/workflow/job-state-machine.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/workflow/queue.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/workflow/rendering.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/workflow/scope-engine.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |
| `okf/workflow/site-profile.md` | `.md` | Normal official Concept | Authoritative human-readable knowledge; retain |

## Reconciled counts

| Classification | Count |
|---|---:|
| Normal official Concept | 40 |
| Root index | 1 |
| Directory index | 9 |
| Log | 0 |
| Reference | 0 |
| Extension documentation | 15 |
| Transitional legacy artifact | 0 |
| Deprecated artifact | 0 |
| Unknown Markdown artifact | 0 |
| Manifest | 1 |
| Registry | 8 |
| Schema | 2 |
| Unknown artifact | 0 |

Total retained artifacts: **76**. Markdown: **65**. Non-Markdown: **11**.
