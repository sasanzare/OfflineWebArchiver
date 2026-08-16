# ADR-061: HTML Rewriter, Route Map, and Dependency Map Boundary

## Status

Accepted for Product Phase 18 within the deterministic transformation and
explicit stored-mapping boundary.

## Context

Phase 17 supplies explicit Asset source/content identity, completed content
paths, provenance, and canonical filesystem safety, but it does not transform
rendered HTML or define the route/dependency metadata needed by a future
offline runtime. The repository has no HTML parser dependency, and archived
HTML, CSS, and JavaScript are untrusted content.

## Decision

Archive Core owns a bounded, token-preserving HTML transformation contract.
The implementation recognizes explicit URL-bearing HTML and CSS surfaces,
resolves references against the original document or CSS URL, and performs
lookups against caller-provided Page and completed Phase 17 Asset mappings.
It never executes scripts, fetches unresolved URLs, or constructs physical
paths from URL text.

The first effective original base is used for reference resolution and removed
from rewritten HTML. Canonical links remain original provenance and are not
used as the sole Route identity. Route Map, Original Resource Map, and
External Dependency Map are versioned pure values with deterministic ordering.
Extensionless and SPA routes use portable local route metadata and explicit
fallback metadata rather than invented physical filenames.

Persistence writes rewritten HTML as a separate versioned atomic artifact and
retains rendered.html as the original. SQLite does not store these maps in
Phase 18; they are regenerated or serialized by the owning caller.

## Consequences

Rewriting is deterministic, idempotent for the supported mappings, and
portable across Project roots. Missing and policy-blocked references remain
observable for later validation and replay. A second HTML parser or URL-to-file
algorithm is not introduced. Dynamic JavaScript references, API replay, and
runtime routing require the later Phase 19 boundary.

## Alternatives

- Global HTML/CSS string replacement was rejected because it cannot safely
  distinguish markup, strings, comments, srcset descriptors, or script bodies.
- Executing archived pages in Node or Electron was rejected because archive
  content is untrusted and transformation does not need runtime capabilities.
- Reconstructing Phase 17 paths from URLs was rejected because it would bypass
  persisted content identity and canonical path validation.
- Replacing the original rendered artifact was rejected because a rewrite
  interruption must not destroy the known-good source.
- Adding rewrite tables immediately was rejected because the maps are pure,
  versioned, bounded outputs that can be regenerated without schema coupling.

## Security Impact

The rewriter has no network, filesystem, browser, Secret Store, or privileged
IPC capability. Special schemes are classified explicitly; file URLs cannot
become local file access. Every physical mapping comes from the shared
canonical path contract or a validated portable page route. The security
review covers hostile base values, traversal, reserved names, collisions,
provenance, bounded metadata, and no-script-execution behavior.

## Portability Impact

Local routes and resource paths are repository-relative portable values.
Machine-specific absolute paths are not serialized. Case and Unicode collision
keys are explicit, and the existing Project-root resolver remains the
Persistence authority.

## Testing Impact

The Phase 18 focused suite covers URL resolution, base handling, pages/assets,
CDN mappings, missing dependencies, canonical provenance, special schemes,
CSS base resolution, srcset, route serialization, extensionless and SPA
metadata, case/Unicode collisions, canonical path rejection, idempotence, and
atomic derived output. Existing Phase 17 suites remain regression gates.

## Migration Impact

No SQLite, Project Format, or transport migration is required. Existing
projects retain schema 12 and can regenerate Phase 18 derived outputs from
their original rendered pages and completed Asset mappings. The separate
rewritten-v1.html artifact is optional and does not alter rendered.html.

## Evidence

- [Phase 18 implementation report](../PHASE_18_IMPLEMENTATION_REPORT.md)
- [Phase 18 architecture](../../architecture/HTML_REWRITER.md)
- [Phase 18 security review](../../architecture/PHASE_18_SECURITY_REVIEW.md)
- [Phase 18 focused tests](../../../tests/unit/rewrite.test.ts)
- [Phase 18 Persistence integration test](../../../tests/integration/rewrite-persistence.test.ts)

## Phase Impact

This ADR closes the Phase 18 transformation boundary and prepares the
rewritten page, Route Map, Original Resource Map, and External Dependency Map
for Phase 19. It does not implement Network Replay, Strict Offline mode,
Local Runtime, Service Worker runtime enforcement, or Phase 20 validation.

## Traceability

- Requirements: FR-ARCHIVE-001, FR-ARCHIVE-002, FR-ASSET-001, FR-PROJECT-004,
  NFR-PORT-002, NFR-REL-002, NFR-SEC-003, NFR-TEST-001.
- Acceptance: AC-REWRITE-001, AC-REWRITE-002, AC-P18-001 through AC-P18-013.
- Related decisions: OD-081, OD-084, OD-085.
- Related risks: R-031, R-045, R-088, R-089, R-096, R-115, R-116, R-117,
  R-118.
