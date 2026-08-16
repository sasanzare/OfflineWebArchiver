# Product Phase 18 Security Review

## Security posture

Phase 18 transforms untrusted archived HTML and CSS in Archive Core. It does
not execute archived JavaScript, fetch unresolved references, access browser
contexts, invoke privileged IPC, read arbitrary local files, or write outside
the Project root. The result is metadata and derived output for a later
isolated runtime; it is not an offline runtime itself.

## Controls reviewed

- **Untrusted content:** the tokenizer treats script and style bodies as
  opaque text. URL rewriting is limited to explicit HTML attributes, srcset,
  and CSS url()/import surfaces. No JavaScript interpreter or dynamic string
  rewrite is present.
- **URL resolution:** references are resolved against the original document or
  CSS URL, including absolute, relative, protocol-relative, query, and
  fragment semantics. Credentials and malformed/backslash-based references fail
  closed.
- **Base handling:** the first effective original base controls resolution, but
  the base element is removed from derived HTML. This prevents a preserved
  public base URL from turning local relative references back into network
  requests.
- **Special schemes:** mailto, tel, javascript, data, and about values are
  preserved or classified without download. blob is recorded as a future
  replay candidate. file is blocked by policy. Unsupported schemes are not
  converted to filesystem paths.
- **Canonical paths:** local physical resources come only from validated
  canonical mappings. Phase 17 completed Asset mappings contribute their
  persisted safe storage path; Phase 18 does not derive paths from hostile URL
  text. The shared canonical mapper rejects traversal, absolute/drive/UNC
  paths, reserved names, separator confusion, non-NFC values, and collisions.
- **Provenance and observability:** unresolved references retain bounded source
  metadata and classification. Missing or external resources cannot be
  reported as local success. Raw metadata is bounded and HTTP URL metadata is
  sanitized before being retained.
- **Output integrity:** rewritten HTML is written to a separate versioned
  artifact with the existing Project-root resolver and atomic-write helper.
  rendered.html remains the original known-good output.
- **Isolation boundary:** the rewriter has no Electron, Node filesystem, Secret
  Store, proxy, or network capability. The Persistence adapter accepts only a
  bounded artifact identifier and delegates path validation to the existing
  Project persistence boundary.

## Adversarial coverage

Focused tests cover encoded traversal, relative traversal, file URLs, Windows
drive and UNC forms, malformed references, hostile base handling, missing
assets, canonical provenance, special schemes, case and Unicode route
collisions, deterministic serialization, and idempotent reruns. The
Persistence integration test verifies that atomic derived output leaves the
original rendered page unchanged and rejects an unsafe artifact identifier.

## Residual risks and limits

The transformation does not prove that an external resource is safe or
available, and it does not authorize a new host. It also does not parse
application-specific JavaScript or discover dynamic references. Large inputs
are bounded by contract limits; broader production target-site and isolated
runtime validation remain later gates.

## Related records

- [Phase 18 implementation report](../project/PHASE_18_IMPLEMENTATION_REPORT.md)
- [HTML Rewriter architecture](HTML_REWRITER.md)
- [Canonical Path Safety](CANONICAL_PATH_SAFETY.md)
- [Phase 17 security review](PHASE_17_SECURITY_REVIEW.md)
- [Phase 19 Network Replay ADR](../project/adr/ADR-054-network-replay-and-strict-offline-contract.md)
