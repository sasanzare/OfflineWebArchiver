# Security Boundaries

Electron main is privileged; preload is a narrow capability boundary; renderer is untrusted. Context isolation, disabled Node integration, sandbox, web security, local restrictive CSP, denied permissions/downloads/windows/webviews/navigation, exact sender/frame/URL authorization, and contract validation remain mandatory.

Phase 4 adds main-owned native path grants; renderer can request only an exact Project/archive operation, not filesystem APIs. Application Service is the orchestration boundary. Persistence owns all filesystem/SQLite/ZIP activity. Project/ZIP is untrusted local input and must pass strict path, schema, migration, integrity, identity, resource, checksum, and staging rules before mutation/promotion.

| Boundary | Current control | Explicit limitation |
|---|---|---|
| Renderer to main | Two bridge capabilities, sender/frame/URL/path-grant checks | Renderer compromise can request granted operations only |
| Project paths | Relative portable contract, symlink caution, atomic exact targets | Hostile local writer/network FS not contained |
| SQLite | No extensions, defensive/trusted-schema, prepared data, integrity/migration checks | Recovery/large-scale policy continues in P17 |
| ZIP import | Central preinspection, collision/special/limit/checksum/inventory checks, staging | Bounded in-memory; no ZIP64/encryption/authenticity |
| Single writer | Owned lock plus SQLite immediate transaction | Coordination, not access control; PID/network-FS limitations |
| Secrets | No secret schema; auth/proxy/log/temp/backups excluded from export | Future secret storage needs P12/P14/P20 reviews |
| Network/browser | Implemented absence | Scope/network policy begins P5; browser begins P7 |
| Cross-platform | Portable path corpus | Packaged Linux/macOS/cross-OS execution remains unverified |

The detailed review is [Product Phase 4 Security Review](PHASE_04_SECURITY_REVIEW.md).
