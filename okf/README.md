# Canonical OKF

This directory is the active Organizational Knowledge Framework for Offline Web Archive Builder as of Product Phase 3. Machine-readable registries are authoritative for current identifiers, links, statuses, phases, and evidence references. Product and project documents remain the source authority for requirements, acceptance criteria, risks, and decisions.

Run `npm run okf:validate` after any relevant source, contract, test, documentation, phase, decision, risk, or evidence change. The validator reports errors and never repairs records. `npm run okf:migrate` verifies that the bootstrap-preserving migration remains materialized.

`okf-bootstrap/` is preserved as historical bootstrap evidence. Its proposed structure is superseded by this canonical structure, but its unresolved questions remain active where the decision registry says `UNKNOWN` or `NEEDS_OWNER_CONFIRMATION`.

Product Phase 3 verifies the architecture foundation and the bounded `system.describe` smoke only. Crawling, persistence, authentication, proxy use, archive generation, final browser runtime, and production packaging remain planned.
