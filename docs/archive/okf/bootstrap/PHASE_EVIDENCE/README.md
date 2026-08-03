# Bootstrap Phase Evidence

**Document status:** Proposed bootstrap contract  
**Owner:** Product phase owner with QA Lead  
**Last updated:** 2026-07-31

This directory stores temporary human-readable Product Phase evidence summaries
only while canonical OKF is not active.

The Product Phase 2 evidence record is:

```text
okf-bootstrap/PHASE_EVIDENCE/PHASE_02_FEASIBILITY_EVIDENCE.md
```

It was created after the Product Phase 2 development, test, packaging, and
packaged-runtime evidence was produced. It records the clean-machine result as
`PARTIAL` because no separate clean Windows host was available; that limitation
does not overwrite the verified packaged local simulation.

## Naming

```text
PHASE_<two-digit-product-phase>_<UPPER_SNAKE_CASE_PURPOSE>.md
```

One authoritative phase summary is preferred. Supplementary evidence belongs in
the repository’s actual test/build/report locations and is referenced with
repository-relative paths; it is not copied here.

## Required record format

```text
Phase ID:
Product phase number:
Phase name:
Objective:
Initial repository state:
Changed domains:
Files created:
Files modified:
Files removed:
Requirements affected:
Acceptance criteria affected:
Risks affected:
Decisions affected:
Architecture decisions:
Public contracts changed:
Database changes:
Configuration changes:
Security impact:
Privacy impact:
Platform impact:
Tests added:
Tests executed:
Builds produced:
Runtime evidence:
Known limitations:
Open conflicts:
Unknown items:
Deprecated artifacts:
Migration requirements:
Final verification status:
Commit hash:
Handoff summary:
```

Use `Commit hash: NOT_COMMITTED` when no commit exists. Every claimed test, build,
or runtime result must link to existing evidence and state its exact command,
environment, result, date, and limitation. A file path alone does not prove a
claim.

## Product Phase 2 requirements

The Phase 2 record must:

- label the Technical Spike experimental;
- record Electron, bundled Chromium/Playwright, sample SPA rendering, final HTML,
  loopback server, clean-Windows package, compatibility, size, resource, failure,
  and feasibility evidence actually obtained;
- record unresolved choices and risks;
- avoid treating spike directories or process boundaries as final architecture;
  and
- update bootstrap domains, relationships, traceability, gaps, decisions, and
  handoff.

## End of bootstrap evidence

After canonical activation in Product Phase 3, new phase evidence moves to the
canonical `phases/` and `evidence/` structure. This directory does not grow
indefinitely. Bootstrap summaries remain historical evidence and are marked
migrated or superseded according to
[Migration and Activation Plan](../MIGRATION_AND_ACTIVATION_PLAN.md); they are not
deleted.
