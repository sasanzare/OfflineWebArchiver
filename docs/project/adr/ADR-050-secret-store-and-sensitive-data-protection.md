# ADR-050: Secret Store and Sensitive Data Protection

## Status

Accepted for the Product Phase 11 implementation; the overall product phase remains conditional on the existing Phase 9/10 gate.

## Context

Later authentication, session, proxy, API, export, and diagnostic features require a stable sensitive-data boundary. Storing values in Project metadata, SQLite, renderer state, CLI arguments, ordinary exports, logs, screenshots, or broad diagnostics would create multiple uncontrolled disclosure paths. The baseline has no secret persistence and must remain backward compatible.

## Decision

Add a project-scoped `SecretStorePort` with strict opaque references and metadata-only inspection. Use a dedicated `packages/secrets` implementation with a production Portable Vault, an Electron-main OS-protected adapter, and a clearly test-only memory adapter. Encrypt records with versioned AES-256-GCM envelopes and random per-record DEKs; wrap the Vault master key with a passphrase-derived versioned scrypt KEK. Bind identity and metadata with AAD, validate cost/size/version limits, use atomic fsync/rename writes and generation checks, and clear mutable buffers where practical.

Keep raw secret bytes and passphrases out of the general contract, renderer, CLI arguments, logs, diagnostics, and ordinary Project Export. Expose only metadata/status and safe lifecycle results through Application Service. Make Secure Export an explicit authenticated encrypted operation with its own passphrase and confirmation. Use a deterministic diagnostic allowlist and centralized recursive redaction.

## Consequences

Later phases can resolve a reference for a declared purpose without knowing whether storage is OS-protected or portable. Existing Projects remain valid without a Vault, and ordinary exports remain secret-free. The implementation adds a bounded file artifact and operational concepts for lock, rotation, provider capability, export policy, and cleanup.

## Alternatives

- Store secret payloads in SQLite: rejected because it expands the ordinary Project database/export boundary and complicates independent key lifecycle.
- Use a plaintext file or obfuscation: rejected because it does not provide confidentiality or tamper detection.
- Expose a generic renderer/CLI `readSecret`: rejected because it creates a broad exfiltration primitive.
- Reuse the unlocked Vault key for Secure Export: rejected because transfer needs explicit user intent and independent protection.

## Security Impact

Positive: authenticated encryption, project isolation, fail-closed provider selection, scoped access, safe redaction, export exclusion, diagnostic allowlisting, and owned temporary cleanup reduce plaintext exposure. Residual risks include runtime copies, storage-media remnants, unsupported native providers, forgotten passphrases, and a compromised running host.

## Portability Impact

Portable Vault is the cross-platform fallback. Electron `safeStorage` is used only in privileged main code and must be qualified on each target OS; Linux `basic_text` is rejected. No cross-platform success is claimed without native evidence.

## Testing Impact

Focused tests cover references/isolation, AEAD/AAD tamper, Vault lifecycle, replacement/rotation, Secure Export/Import, test-only backend enforcement, OS insecure-provider rejection, redaction, diagnostics, temporary cleanup, ordinary export exclusion, and screenshot policy. Unit, integration, typecheck, build, architecture, contract, security, documentation, and OKF validators remain required.

## Migration Impact

SQLite schema remains `7` and Project format is unchanged. Existing Projects open with an uninitialized Secret Store. Initialization is explicit; no secret file is created implicitly. Future backend migration must authenticate both sides, preserve/remap references explicitly, and promote atomically.

## Evidence

- [Secret Store source](../../../packages/secrets/src/index.ts)
- [Secret Store tests](../../../tests/secrets/secret-store.test.ts)
- [Application Service metadata-only integration](../../../tests/integration/application-service.test.ts)
- [Contract tests](../../../tests/unit/contracts.test.ts)
- [Security review](../../architecture/PHASE_11_SECURITY_REVIEW.md)

## Phase Impact

This ADR implements the Secret Store foundation required by Product Phase 11. It does not close the missing Product Phase 9 Discovery Engine prerequisite or the partial Product Phase 10 integration gate, and it does not implement Product Phase 12/13 workflows.

## Traceability

- Acceptance: `AC-P11-001` through `AC-P11-014`
- Existing requirements: `NFR-SEC-002`, `NFR-SEC-003`, `NFR-PRIV-001`, `NFR-MAINT-001`, `NFR-TEST-001`, `FR-PROJECT-004`, `FR-DIAG-001`
- Risks: `R-021`, `R-052`, `R-100`, `R-108`, `R-109`, `R-110`
- OKF change: `OKF-CHG-P11-001`
