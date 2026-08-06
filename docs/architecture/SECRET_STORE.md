# Secret Store

## Status

Product Phase 11 adds the production Secret Store foundation. The implementation is locally validated, while the overall phase gate remains conditional because the repository still records the Product Phase 9 prerequisite as absent and Product Phase 10 as partial.

The Secret Store is a privileged, project-scoped capability. It owns secret bytes, encryption, key lifecycle, backend selection, and sensitive temporary data. Archive Core owns the pure reference, metadata, policy, and error contracts; the `secrets` package owns storage adapters; Application Service is the only production orchestration path.

## Boundary and data model

Secret values are mutable `Uint8Array`/`Buffer` data and are never represented by a `SecretRef`. A reference has the strict form:

```text
secret://v1/project/<project-uuid>/<secret-uuid>
```

The project identifier in the reference, the store instance, the metadata scope, and every access context must agree. A reference is opaque to callers and is not derived from the secret value.

Persisted metadata is limited to identity, kind, scope, timestamps, lifecycle/version, a separately supplied display label, export policy, envelope version, key slot, and migration state. It contains no preview, digest intended for display, entropy estimate, or reversible secret.

## Port

`SecretStorePort` exposes initialization/unlock/lock, capability and status, lifecycle operations, scoped resolution, cryptographic rotation, and explicit encrypted export/import. `withSecret` is the only resolution primitive: it gives a callback a temporary byte buffer and clears the store-owned buffer when the callback completes.

All resolution calls require a project and an access purpose. The store checks purpose/kind compatibility and scope before decrypting. List, inspect, service, CLI, and renderer-facing results contain metadata only.

The production transport intentionally does not carry raw values or passphrases. Electron main may receive a future narrow privileged write-only input, but Phase 11 does not implement login, OTP, session capture, or proxy UI.

## Backends

| Backend | Production role | Policy |
|---|---|---|
| `portable_vault` | Cross-platform encrypted Vault under the Project `secrets/` directory | Safe fallback and explicit Portable Data mode |
| `os_protected` | Electron main-process adapter over the platform protected storage API | Requires a secure provider; unavailable or `basic_text` providers fail closed |
| `memory_test` | Synthetic tests only | Rejected by the production factory unless an explicit test-only flag is supplied |

The backend status/capability model reports availability, lock state, provider, and supported operations without exposing key material or file contents.

## Related controls

- [Credential References](CREDENTIAL_REFERENCES.md)
- [Portable Vault](PORTABLE_VAULT.md)
- [Secret Cryptography](SECRET_CRYPTOGRAPHY.md)
- [Secret Key Hierarchy](SECRET_KEY_HIERARCHY.md)
- [OS-protected storage](SECRET_OS_STORAGE.md)
- [Logging and redaction](SECRET_LOGGING_AND_REDACTION.md)
- [Export and diagnostics](SECRET_EXPORT_AND_DIAGNOSTICS.md)
- [Temporary data and screenshots](SECRET_TEMPORARY_DATA.md)
- [Phase 11 security review](PHASE_11_SECURITY_REVIEW.md)
