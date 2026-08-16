# Phase 18 HTML Rewriter, Route Map, and Dependency Map

## Boundary

Phase 18 is a deterministic transformation layer over already-rendered,
already-stored archive content. It does not discover pages, download missing
resources, execute archived scripts, intercept browser requests, serve an
archive, or implement strict offline replay.

The source page remains the original rendered artifact. A rewritten artifact is
derived from the source HTML, the page's original URL, a versioned mapping
index, and the Phase 18 rewrite contract. The transformation is repeatable and
does not require network access.

## Transformation pipeline

The pipeline is:

1. Validate bounded input and the original page URL.
2. Tokenize HTML without executing scripts or styles.
3. Apply the first valid base URL according to the original document semantics.
4. Enumerate supported URL-bearing attributes and parse srcset candidates.
5. Resolve each reference against the effective original base.
6. Look up the resolved URL in the caller-provided Page and Phase 17 Asset
   mappings.
7. Rewrite only references with a valid local mapping, preserving query and
   fragment semantics where applicable.
8. Preserve canonical metadata as original provenance and remove the original
   base element so it cannot redirect local output to the public Internet.
9. Record every unresolved or policy-classified reference in the dependency
   map.
10. Serialize stable output and, when requested, persist it as a separate
    atomic derived artifact.

The implementation uses a bounded token-preserving scanner in
packages/archive-core/src/rewrite.ts. This avoids arbitrary global substitution
and avoids adding a DOM/runtime dependency to Archive Core. Raw script and
style text is preserved; no JavaScript or CSS code is executed.

## Mapping contracts

RewriteMappingIndex accepts canonical original URLs and explicit local
representations. A page mapping contains a portable local route; an Asset
mapping is accepted from the completed Phase 17 source/content mapping and
uses the persisted content storage path. Phase 18 never reconstructs a Phase 17
content path from a URL.

Callers that already use Scope Engine normalization can inject that
normalizer. The default rewrite normalizer is limited to fragment removal,
credential rejection, and deterministic HTTP(S) URL normalization; it is not a
replacement for Scope Engine authorization.

## HTML and CSS

The HTML surface covers navigation, images, scripts, stylesheets, media,
iframes, forms, object/embed/track/input resources, SVG image/use references,
icons, manifests, preload-like links, canonical metadata, and srcset
candidates. Special schemes are classified explicitly. Inline JavaScript is
not rewritten.

CSS is an explicit second transformation through rewriteCss. CSS url() and
quoted @import references resolve relative to the original CSS resource URL,
not the containing HTML page. Strings and comments are scanned with CSS-aware
state so arbitrary text is not replaced.

## Route and dependency metadata

Route Map entries contain original and normalized URL identity, a portable local
route, page identity, route type, resolution state, and optional SPA fallback
metadata. Extensionless routes remain routes; they do not become physical
filenames. Stable sorting and collision records make case, Unicode, trailing
slash, and route-key collisions explicit.

The External Dependency Map records the originating page, element/attribute,
raw and resolved reference metadata, resource kind, normalized URL where safe,
and a classification such as missing-local-resource, external-not-archived,
blocked-by-policy, unsupported-scheme, or future-network-replay-candidate.
Unresolved content is observable and is never treated as a successful local
mapping.

OriginalResourceMap keeps the original URL-to-local relationship for Pages and
completed Assets. This preserves provenance for later validation and Phase 19
without making canonical metadata the source of route identity.

## Persistence and Phase 19 handoff

The core maps are pure versioned values and can be serialized by callers; no
SQLite migration is required for this phase. Persistence writes
pages/<job-id>/rewritten-v1.html beside, and never over, rendered.html using
the existing Project-root resolver and atomic-write helper. A failed rewrite
cannot replace the original rendered page.

Phase 19 can consume the rewritten page, Route Map, OriginalResourceMap, and
ExternalDependencyMap to build replay/runtime behavior. Network Replay,
BrowserContext interception, strict offline enforcement, Service Worker
runtime handling, and Local Runtime serving remain outside this component.

## Related records

- [Phase 18 implementation report](../project/PHASE_18_IMPLEMENTATION_REPORT.md)
- [Phase 18 security review](PHASE_18_SECURITY_REVIEW.md)
- [Phase 18 ADR](../project/adr/ADR-061-html-rewriter-route-and-dependency-maps.md)
- [Asset Downloader](ASSET_DOWNLOADER.md)
- [Canonical Path Safety](CANONICAL_PATH_SAFETY.md)
- [Network Replay](NETWORK_REPLAY.md)
