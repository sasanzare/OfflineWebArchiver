# Security Boundaries

## Product Phase 8 Browser boundary

The Browser Runtime is privileged production infrastructure owned by Application Service. Its executable must be an exact, checksum-verified, root-contained owned Chromium resource. Sandbox stays enabled; no system fallback, normal-launch download, system profile, arbitrary flag/path, external debug port, extension, or HTTPS bypass exists. A fresh Context clears permissions and blocks service workers; popups/downloads/dialogs are closed/cancelled/dismissed.

Every request and redirect is authorized pre-dispatch for method, Phase 5 scope, DNS address classes, and final URL. Production loopback/private/link-local/reserved targets fail closed. Render artifacts use fixed Project-relative paths, bounded sizes, atomic writes, SHA-256, and current Lease/Fencing checks. The isolated Electron renderer never receives Playwright/raw Browser/filesystem/SQL/process primitives.

## Product Phase 7 ownership boundary

Protected writes validate Project, Run, Job, owner, the active Lease token digest, the Phase 6 compatibility claim where applicable, active status, exact expiry, and current Fencing Generation. The Project database contains the active owner credential for durable identical-claim replay and must be protected as sensitive local state. Project-open recovery is read-only. Mutating recovery is explicitly confirmed/idempotent/bounded. Checkpoint secret-like keys and unsafe paths fail closed; completed output rejects traversal and symlink escape. See [Phase 7 Security Review](PHASE_07_SECURITY_REVIEW.md).

Scope evaluation is not network authorization. Phase 6 re-evaluates Scope before enqueue, binds Jobs to Project/Run/Profile/revision/engine, redacts sensitive URL/error/result values, bounds payloads/pagination, parameterizes SQL, and requires claim tokens for terminal writes. Desktop `connect-src 'none'` and its existing sandbox/IPC/path-grant boundary remain unchanged. See the [Product Phase 6 Security Review](PHASE_06_SECURITY_REVIEW.md).

Electron main is privileged; preload is a narrow capability boundary; renderer is untrusted. Context isolation, disabled Node integration, sandbox, web security, local restrictive CSP, denied permissions/downloads/windows/webviews/navigation, exact sender/frame/URL authorization, and contract validation remain mandatory.

Phase 4 adds main-owned native path grants; renderer can request only an exact Project/archive operation, not filesystem APIs. Application Service is the orchestration boundary. Persistence owns all filesystem/SQLite/ZIP activity. Project/ZIP is untrusted local input and must pass strict path, schema, migration, integrity, identity, resource, checksum, and staging rules before mutation/promotion.

| Boundary | Current control | Explicit limitation |
|---|---|---|
| Renderer to main | Two bridge capabilities, sender/frame/URL/path-grant checks | Renderer compromise can request granted operations only |
| Project paths | Relative portable contract, symlink caution, atomic exact targets | Hostile local writer/network FS not contained |
| SQLite Queue | No extensions, defensive/trusted-schema, prepared data, ownership FKs, unique identity, immediate short transactions, integrity/migration checks | Scale/retention policy open; stale processing is P7 |
| ZIP import | Central preinspection, collision/special/limit/checksum/inventory checks, staging | Bounded in-memory; no ZIP64/encryption/authenticity |
| Single writer | Owned lock plus SQLite immediate transaction | Coordination, not access control; PID/network-FS limitations |
| Secrets | No secret schema; auth/proxy/log/temp/backups excluded from export | Future secret storage needs P12/P14/P20 reviews |
| Network/browser | Implemented absence | Queue state is not crawl evidence; dispatch/rendering remains future work |
| Cross-platform | Portable path corpus | Packaged Linux/macOS/cross-OS execution remains unverified |

Inherited Project controls remain in the [Product Phase 4 Security Review](PHASE_04_SECURITY_REVIEW.md), Scope controls in the [Product Phase 5 Security Review](PHASE_05_SECURITY_REVIEW.md), and Queue controls/deferred recovery in the [Product Phase 6 Security Review](PHASE_06_SECURITY_REVIEW.md).
