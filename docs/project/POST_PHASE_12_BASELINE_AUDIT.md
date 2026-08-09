# Post-Phase-12 Baseline Audit

## Scope

This audit compares the repository at the Phase 13 starting commit
`d59390f7a060321fe37ece716ec74d06b5071ba3` with the Phase 12 implementation
report, Phase 12 security review, acceptance matrix, and the current source.
The named revised proposal file was not present in the accessible repository or
home search paths; the attached Phase 13 request is the authoritative task
input.

## Verified baseline

- Manual Login remains headed and user-driven. Credentials are not captured by
  the application and protected Storage State remains behind the Secret Store.
- Restored sessions use a fresh headless Context, validation, ownership checks,
  affinity checks, and explicit reauthentication semantics.
- Queue, Lease, Checkpoint, fencing, recovery, render, interaction, and Secret
  Store ledgers remain in their existing package boundaries.
- Browser Runtime remains the sole Playwright adapter. The renderer receives no
  Browser, Page, Context, filesystem, SQL, or process handle.
- The Phase 12 real pinned-Chromium gate is not verified. The current browser
  fixture cannot bind its local fixture server in the sandbox (`listen EPERM`),
  and the earlier provisioning attempt failed with DNS `ENOTFOUND`.

## Remediated in Phase 13

- Authentication Context authorization now applies the explicit origin
  allowlist to documents, subresources, redirects, and provider requests.
- Crawl Run lifecycle state is a versioned model separate from legacy pause
  control and is persisted in migration 009.
- Network Replay and Strict Offline contracts define deterministic request keys,
  sensitive-header filtering, local-origin handling, and fail-closed unknown
  external requests without claiming a full replay engine.
- Service Worker behavior is an explicit versioned Site Profile policy with a
  safe default of `block`.
- Canonical path validation is centralized in Archive Core and consumed by
  Project Format, Recovery, and SQLite path writes/verification.
- Desktop command transport now requires an approved command type in addition
  to exact sender, main-frame, origin, and path authorization.
- An explicit untrusted archive runtime baseline is documented; the current
  product does not load archived HTML in a trusted window.
- Worker/network concurrency dimensions and a SQLite stress plan are documented
  without introducing a future Worker Pool or downloader.
- A registered Service Worker fixture now covers policy `block` and explicit
  policy `allow`; its browser evidence remains blocked by the missing
  repository-owned Chromium artifact.

## Deferred by design

- Full Network Replay execution, archive runtime hosting, downloader behavior,
  HTML rewriting, API capture, proxy routing, Worker Pool scheduling, and
  packaging/release support remain outside Phase 13.
- `sessionStorage` persistence remains unsupported.
- Platform support is a policy and evidence matrix; no unsupported platform is
  promoted from documentation alone.

## Blocked by environment

- Real pinned-Chromium authentication and Service Worker browser evidence is
  blocked until the registered fixtures can run with an available
  repository-owned browser. Sandbox execution is blocked by `listen EPERM`;
  escalated execution can bind the fixture but reaches
  `BROWSER_INSTALLATION_MISSING` / `BROWSER_LAUNCH_FAILED`. Browser provisioning
  also fails with DNS `ENOTFOUND`.
- Native Windows 11/Windows 10/Linux/macOS matrix evidence is not available in
  this local environment.

## Open risks and closure rule

No Critical security finding is silently deferred. The blocked browser and
platform items remain explicit acceptance blockers and are tracked in
`docs/architecture/PHASE_13_SECURITY_REVIEW.md`. Phase 13 cannot be marked
complete until the required evidence is executed or the acceptance owner records
an explicit scope decision outside this implementation task.

## Related records

- [Phase 13 implementation report](PHASE_13_IMPLEMENTATION_REPORT.md)
- [Phase 12 implementation report](PHASE_12_IMPLEMENTATION_REPORT.md)
- [Phase 12 security review](../architecture/PHASE_12_SECURITY_REVIEW.md)
- [Phase 13 security review](../architecture/PHASE_13_SECURITY_REVIEW.md)
- [Acceptance matrix](../product/ACCEPTANCE_MATRIX.md)
