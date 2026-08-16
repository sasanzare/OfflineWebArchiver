# Product Phase 17 Security Review

## Security posture

Phase 17 is a bounded local Asset pipeline for authorized archive work. It
consumes explicit descriptors and does not add discovery, credential capture,
HTML execution, replay, or a direct network server. The production network
adapter remains an injected boundary and must reuse the existing Scope,
Scheduler, Proxy, Session, and Secret Store policies when wired.

## Controls reviewed

- **Authorization and scheduling:** each request is authorized before dispatch,
  redirects are re-authorized, and every outbound request acquires the Phase 16
  Origin budget. Proxy and authenticated Session affinity are checked before
  downloading; no direct fallback is available.
- **Lease and fencing:** source claims and progress/finalization writes validate
  Project, Run, Page Job, owner, lease token, expiry, and fencing generation.
  An active claim excludes a second owner, and stale finalization is rejected.
- **URL metadata:** credentials are rejected; fragments are removed; meaningful
  query parameters remain part of identity; sensitive query values are redacted
  in canonical metadata and errors do not include response bodies.
- **Filesystem:** all generated paths are canonical Project-relative values.
  Root escape, separator confusion, reserved names, symlink targets, and
  symlinked ancestors are rejected. Temporary, lock, and final paths use the
  same mapper. Deduplication never creates links.
- **Integrity:** only streamed bytes that pass maximum-size, expected-length,
  validator/resume, SHA-256, and final regular-file checks can become completed
  content. Partial files remain isolated until atomic promotion.
- **Concurrency and crash safety:** exclusive content locks, durable progress,
  Recovery checkpoints, atomic rename, and idempotent SQLite finalization cover
  duplicate workers and interruption boundaries. Lock cleanup never deletes an
  arbitrary stale lock.

## Residual risks and limits

The focused fixtures use deterministic in-memory network responses. They do not
prove behavior against an authorized production target, DNS rebinding, proxy
provider variance, low-disk conditions, or multi-day saturation. The eventual
HTTP/Browser adapter must preserve the port contract, pass redirect/scope
revalidation, and surface safe status metadata through the scheduler. Phase 9
discovery and later rewriting/replay controls remain out of scope.

## Evidence

The focused security/path tests are `tests/integration/asset-path-safety.test.ts`
and the downloader/concurrency tests under `tests/integration` and
`tests/concurrency`. Repository-wide static security and architecture checks
are separate gates and are not replaced by these fixtures.
