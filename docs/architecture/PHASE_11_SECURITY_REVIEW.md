# Product Phase 11 Security Review

## Scope and gate

This review covers the implemented Secret Store foundation. Local tests and validators provide implementation evidence. The product phase remains `PARTIAL`/conditional because the baseline's Phase 9 Discovery Engine is absent and the Phase 10 acceptance gate is not closed; Phase 11 does not silently claim those prerequisites.

## Threats and controls

| Threat | Control | Evidence |
|---|---|---|
| Secret appears in a reference or metadata | Strict opaque references; allowlisted metadata; no previews/content hashes | `tests/secrets/secret-store.test.ts`; `tests/unit/contracts.test.ts` |
| Cross-Project lookup or scope confusion | Canonical project checks in refs, metadata, access context, and store | Secret-store isolation tests; Application Service tests |
| Vault disclosure or tampering | AES-256-GCM envelopes, AAD, scrypt-wrapped master key, fresh nonce/DEK, strict parser | Secret crypto/Vault tests; `tools/secrets/validate.mjs` |
| Wrong passphrase, replay, concurrent write, or crash | Safe failure, unlock rate limit, inactivity lock, generation check, owned lock, atomic fsync/rename/read-back | Secret-store tests; Portable Vault documentation |
| Insecure OS backend | Provider capability check and `basic_text` rejection; Portable Vault fallback | OS backend test and capability model |
| Secret leakage through logs/errors/URLs/headers | Recursive sanitizer, URL/query policy, header policy, safe error projection | Redaction and audit tests |
| Ordinary export or diagnostics include secret data | Export path exclusions and diagnostic allowlist | Project export and diagnostics tests |
| Plaintext temp or screenshot leakage | Owned temp cleanup, stale cleanup, sensitivity-aware screenshot policy | Temp/screenshot tests |
| Renderer/CLI/IPC receives raw secret | Metadata-only contracts and surfaces; no generic read bridge or passphrase argument | Contract, CLI, architecture, and Electron boundary tests |

## Residual risks

The JavaScript runtime may retain copies that cannot be guaranteed zeroized. Filesystem media may retain old blocks after overwrite/unlink. Native macOS/Linux provider qualification is not claimed from the Windows development environment. A forgotten Portable Vault passphrase has no recovery path in this phase. A fully compromised running host can observe plaintext while an authorized callback is executing.

Future login, session, OTP, proxy, and runtime phases must define their own narrow write-only input, purpose, retention, consent, and integration evidence; they must not bypass this port or add raw secret fields to the general transport contract.
