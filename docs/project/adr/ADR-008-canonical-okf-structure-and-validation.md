# ADR-008 — Canonical OKF Structure and Validation

## Status

Accepted on 2026-07-31.

## Context

OD-026 and bootstrap questions required Product Phase 3 to turn proposed narrative governance into a canonical, machine-readable, validated repository structure without deleting historical evidence or inflating implementation claims.

## Decision

Activate `okf/` with JSON manifest/registries as current machine authority, Markdown knowledge/phase/report records as narrative authority, repository-relative evidence, the mandatory bootstrap status vocabulary, and a fail-closed local validator. Preserve `okf-bootstrap/` as historical evidence; unresolved owner/policy questions stay explicit. Schema/framework version starts at 1.0.0.

## Alternatives Considered

Keeping bootstrap as current, adopting a graph database, generating all knowledge from Markdown, and partial unvalidated activation were considered. Each leaves drift or tooling burden disproportionate to Phase 3.

## Consequences

IDs and evidence are queryable and checked; every relevant future change must update OKF impact. Narrative source authorities remain readable and are not duplicated as implementation truth.

## Security Impact

Paths reject absolute/drive/traversal forms; evidence is repository-local and public-project-safe. Sensitive external artifacts require future policy before registration.

## Portability Impact

JSON/Markdown and the Node validator are cross-platform; paths use repository-relative forward-slash forms.

## Testing Impact

Validation covers JSON/schema shape, IDs, statuses, paths, references, phases, mappings, verified evidence, critical orphans, and the P3 change. Negative policy probes are automated.

## Migration Impact

Phases 1–2 are migrated without changing authority; Phase 3 creates the first canonical change. Bootstrap is marked migrated/superseded but retained. Rollback is documented in the migration report.

## Evidence

`okf/manifest.json`, eight registries, schemas/rules/reports, phase records, migration and validation commands.

## Phase Impact

Resolves OD-026 and the Phase 3 activation subset of OKF-OD-003/004/006/007/008/011/016. Product Phase 4 inherits mandatory OKF impact review.

## Traceability

Requirements: NFR-KNOW-001 through NFR-KNOW-004, NFR-MAINT-001, NFR-TEST-001. Acceptance: AC-OKF-001 through AC-OKF-006, AC-P03-018 through AC-P03-021. Risk: RISK-KNOW-001. Decisions: OD-026 and named OKF-OD records. OKF domains: OKF-DOM-038 through OKF-DOM-041.
