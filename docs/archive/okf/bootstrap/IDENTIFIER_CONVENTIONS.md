# OKF Identifier and Naming Conventions

**Document status:** Proposed bootstrap contract  
**Owner:** Knowledge Governance Owner with Architecture Owner and QA Lead  
**Last updated:** 2026-07-31

Identifiers are stable historical handles, not display names. They remain
traceable after rename, merge, deprecation, or removal.

## Identifier families

| Family | Purpose | Owner | Example form |
|---|---|---|---|
| `OKF-DOM-###` | Knowledge domain | Knowledge Governance Owner | `OKF-DOM-001` |
| `OKF-NODE-###` | Canonical knowledge node | Domain owner | `OKF-NODE-001` |
| `OKF-EVD-###` | Evidence record | Evidence author; QA validates | `OKF-EVD-001` |
| `OKF-REL-###` | Typed relationship | Domain owner | `OKF-REL-001` |
| `OKF-PHASE-###` | Product-phase knowledge record | Product phase owner | `OKF-PHASE-002` |
| `OKF-CHANGE-###` | Knowledge change event | Phase author | `OKF-CHANGE-001` |
| `OKF-GAP-###` | Bootstrap/canonical knowledge gap | QA or domain owner | `OKF-GAP-001` |
| `OKF-CONFLICT-###` | Documentation/evidence conflict | Assigned conflict owner | `OKF-CONFLICT-001` |
| `OKF-CHECK-###` | Validation rule/check | QA Lead | `OKF-CHECK-001` |
| `OKF-OD-###` | OKF-specific open question/decision | Named question owner | `OKF-OD-001` |

Reserved project families remain unchanged:

- `FR-<DOMAIN>-###` and `NFR-<DOMAIN>-###` — product requirements.
- `AC-<DOMAIN>-###` — acceptance criteria.
- `OD-###` — main project open decisions.
- `FX-###` — fixture categories.
- `TS-###` — target-site acceptance tests.
- `R-###` — the 37 legacy Phase 1 risk identifiers actually present in the
  repository.
- `RISK-KNOW-###` — the new knowledge-governance risk family required for OKF.

The generic `RISK-*` form mentioned by the OKF contract is represented by the
repository’s existing `R-###` family and the specific `RISK-KNOW-###` extension.
Existing IDs are never rewritten merely to normalize style.

## Uniqueness and reservation

- The complete identifier string is globally unique.
- Numeric sequences are independent per family and use at least three digits.
- Before canonical activation, IDs are reserved by their definition row in an
  authoritative bootstrap document.
- After activation, the relevant registry reserves the ID atomically before or
  in the same change as its first use.
- A reservation records owner, date, purpose, and status. Abandoned reservations
  are marked deprecated; their IDs are not recycled.
- Validation rejects duplicate definitions and references to undefined active IDs.
- Examples in schemas use placeholders or clearly marked example namespaces; they
  must not accidentally reserve production IDs.

## Rename, deletion, deprecation, and merge

- Display names, slugs, and file paths can change without changing the ID.
- A semantic split creates new IDs and relates them to the source concept.
- A semantic merge selects or creates the current canonical node and marks other
  nodes `DEPRECATED`; `superseded-by` and `merged-into` relationships preserve
  provenance. IDs are not collapsed or reused.
- Deleted concepts remain as tombstone records with final status, reason,
  effective phase/date, former path, incoming/outgoing relationship history, and
  replacement when any.
- An identifier is never reused after deletion, merge, or deprecation.
- Correcting a typo in an identifier normally creates a new identifier and a
  supersession record; in-place correction is permitted only before any other
  committed reference exists and requires review.

## Cross-reference syntax

- Markdown uses the exact ID in code style plus a relative link to its authority
  when practical: `` `NFR-KNOW-001` ``.
- Machine-readable records store IDs as exact uppercase strings, never display
  names.
- Repository evidence paths are root-relative with `/`.
- Markdown links are resolved relative to the source document. Registry builders
  must normalize each link from its source location before producing root-relative
  indexes; they must not reinterpret a source-relative link from the registry
  directory.
- Ranges such as `AC-PROJECT-001..005` are concise prose only. Machine registries
  and validation-critical mappings enumerate every exact ID.

## File and directory names

- Repository-generated names are English.
- Bootstrap governance files use uppercase `SNAKE_CASE.md` because this structure
  is fixed by the OKF Phase 0 contract.
- Canonical directories and knowledge slugs use lowercase kebab-case ASCII, for
  example `project-format/` and `checkpoint-recovery`.
- Machine-readable registry filenames use lowercase kebab-case or the fixed plural
  names in [Target OKF Structure](TARGET_OKF_STRUCTURE.md).
- Slugs contain `a-z`, `0-9`, and single hyphens; no leading/trailing/repeated
  hyphen, whitespace, platform-reserved name, or path separator.
- A slug is not an identifier and may change through a recorded move.
- File extensions are lowercase.
- Case-only renames are avoided because supported filesystems differ.

## Dates and phases

- Dates use ISO `YYYY-MM-DD`; timestamps, when needed, use ISO 8601 UTC with `Z`.
- Product phase references use `P01` through `P25` in machine records and
  “Product Phase 1” through “Product Phase 25” in prose.
- Phase directories use `phase-01` through `phase-25`.
- Product phase records use `OKF-PHASE-001` through `OKF-PHASE-025`.
- **OKF Phase 0** is a cross-cutting bootstrap task, not Product Phase 0 or a
  twenty-sixth product phase.
- When no commit exists, phase records use the exact value `NOT_COMMITTED`.

## Ownership and change control

Domain owners propose node/relationship IDs; QA validates evidence/check IDs;
Product Owner controls requirements/acceptance/phase IDs; risk and decision owners
control their families. The Knowledge Governance Owner arbitrates collisions and
terminology but cannot resolve business, legal, security, or platform authority
questions without the named owner.

Changes to these conventions require `OKF-OD-001` resolution or a later versioned
OKF contract decision, migration rules, validation updates, and preserved old-ID
resolution.
