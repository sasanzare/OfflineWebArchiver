# OKF Migration and Activation Plan

**Document status:** Proposed; execution blocked until Product Phase 3  
**Normal activation:** Product Phase 3 — Architecture, Monorepo, and Layer Contracts  
**Owner:** Architecture Owner with Knowledge Governance Owner and QA Lead  
**Last updated:** 2026-07-31

Canonical activation converts validated bootstrap governance and Product Phase 2
evidence into an OKF structure aligned to the actual repository. It does not
delete or rewrite bootstrap history.

## Activation prerequisites

All must be satisfied:

- [ ] Product Phase 2 Technical Spike is complete under its Definition of Done.
- [ ] `PHASE_02_FEASIBILITY_EVIDENCE.md` records actual findings, failures,
      commands, artifacts, environments, and `NOT_COMMITTED` or real commit hash.
- [ ] Actual repository/monorepo structure exists and is inventoried.
- [ ] Actual package/component names and ownership exist.
- [ ] Architectural layers and process boundaries exist or are accepted by ADR.
- [ ] Archive Core, Local Application Service, Desktop Interface, CLI, and other
      public contract boundaries are known.
- [ ] Blocking main technology decisions needed for architecture are resolved;
      the spike is not treated as a decision by itself.
- [ ] Identifier conventions are approved.
- [ ] Initial manifest/registry/node/evidence/relationship schema direction is
      approved and version/migration behavior is defined.
- [ ] Markdown/JSON authority and manual/generated boundaries are approved.
- [ ] Automated schema/link/semantic validation approach is selected and can run
      in the repository’s chosen toolchain.
- [ ] Domain ownership and conflict-resolution authority are assigned.
- [ ] Sensitive evidence reference/retention policy is approved for any evidence
      category being activated.
- [ ] Migration input is backed up or reproducibly recoverable and a rollback
      procedure is reviewed.

If an item is absent, status remains `BLOCKED` or
`NEEDS_OWNER_CONFIRMATION`; canonical files are not partially presented as
active.

## Migration steps

1. **Freeze bootstrap review.** Record the reviewed working revision/commit,
   reviewers, open questions, exceptions, and a hash/inventory of migration inputs.
2. **Validate bootstrap.** Check required files, English-only repository content,
   unique IDs, allowed statuses, source-relative Markdown links, root-relative
   evidence paths, Phase 1/2 counts, critical mappings, and sensitive patterns.
3. **Create canonical structure.** Add only the directories/files justified by
   approved schemas and actual architecture; do not manufacture empty component
   folders.
4. **Migrate verified records.** Convert current documentary facts, authorities,
   statuses, IDs, owners, source paths, and Phase 2 evidence without increasing
   their evidence authority.
5. **Convert planned records.** Create canonical `PLANNED`, `UNKNOWN`,
   `NEEDS_OWNER_CONFIRMATION`, or `BLOCKED` nodes for approved future obligations;
   no documentary plan becomes implementation-`VERIFIED`.
6. **Create machine-readable registries.** Build domain, node, evidence,
   relationship, phase, decision, risk, and change records according to approved
   schemas and one-way generation rules.
7. **Link repository evidence.** Normalize every path from repository root and
   every Markdown link from its source document; connect commit/method/status and
   supersession metadata.
8. **Validate no orphans.** Compare source authority ID sets with registries;
   ensure every critical requirement maps through acceptance, phase, test, risk,
   decision, domain and current/planned evidence activity.
9. **Mark bootstrap migration.** Add explicit migrated/superseded references and
   effective phase to bootstrap records as appropriate; do not erase active
   unresolved questions.
10. **Preserve bootstrap history.** Retain `okf-bootstrap/` as historical Level 3
    evidence unless a later approved retention policy moves it while preserving
    every stable path/relationship.
11. **Update entry points.** Update repository README and HANDOFF to name
    `okf/README.md` as current, retain the bootstrap-history link, and report
    activation status and unresolved gaps.
12. **Integrate validation.** Add canonical validation to the approved local/CI
    workflow at the timing decided by `OKF-OD-016` and `OKF-OD-017`.

## Activation verification

Required results:

- all approved canonical files and schemas exist; bootstrap remains present;
- IDs are unique and every reference resolves;
- statuses use the mandatory vocabulary and suspicious transitions include new
  evidence/review history;
- no application capability is verified solely by Level 3–5 evidence;
- actual packages/contracts map to architecture nodes and consumers;
- all Product Phase 1 requirements/acceptance/risks/decisions/fixtures and Product
  Phase 2 evidence are accounted for;
- every critical requirement maps to an OKF domain;
- active evidence paths are repository-relative and exist;
- no secret/private target value is present;
- the phase record and change registry describe migration;
- README, DoD, phase plan, traceability and HANDOFF agree on activation; and
- `git diff --check` and selected OKF validation commands pass.

Activation status is `PARTIAL` if the structure exists but any noncritical
approved registry subset is incomplete; it is `BLOCKED` if critical referential,
authority, status, security, or rollback requirements fail. “Directory exists”
alone is never activation success.

## Rollback

Rollback is designed before activation:

1. Stop canonical writes and preserve the failed validation report.
2. Verify the exact newly created/modified canonical targets against the migration
   change record. Do not use broad destructive commands.
3. Revert only the unaccepted canonical activation through a reviewed,
   recoverable operation; never delete or reset `okf-bootstrap/`, Product Phase 1
   authorities, Product Phase 2 evidence, or unrelated user work.
4. Restore README/HANDOFF/current-entry references to bootstrap if they had been
   switched.
5. Record why activation failed, affected IDs/paths, evidence, owner, corrective
   action, and next attempt.
6. Keep canonical status `BLOCKED`; do not claim activation until a new full
   validation passes.

If canonical records have already been committed or consumed, use an explicit
forward migration or repository-approved revert—not history rewriting.

## After activation

- Product Phase records/evidence move to canonical `phases/` and `evidence/`.
- `okf-bootstrap/PHASE_EVIDENCE/` stops receiving new phase files.
- Unresolved bootstrap questions migrate to decision records without renumbering.
- Bootstrap remains historical and links to canonical replacements.
- Product Phases 4–25 follow
  [Phase Evolution Contract](PHASE_EVOLUTION_CONTRACT.md).
