# Secret Export and Diagnostic Bundles

## Ordinary Project Export

The existing ordinary Project ZIP remains a non-secret archive. Its allowlist excludes `secrets/`, `secure-exports/`, `diagnostics/`, authentication/proxy roots, temporary files, raw databases, and unknown directories. It may preserve opaque references and safe metadata needed to report unresolved dependencies, but it never binds them to an unrelated local Secret Store during import.

## Secure Export

Secure Export is a separate explicit operation. It requires confirmation and a separate export passphrase supplied through a privileged internal API, uses a fresh production KDF salt and fresh AEAD envelope, encrypts the complete selected payload, excludes records whose policy forbids export, writes atomically with restrictive permissions, and returns only destination/count/version metadata. It never reuses the unlocked Vault key implicitly, stores the export passphrase, uploads the archive, or creates a plaintext intermediate.

Secure Import validates the complete authenticated payload before changing the destination Vault, checks Project identity and metadata, rejects unsupported versions/algorithms/duplicates/truncation, and uses the Secret Store API. It produces safe errors and clears decrypted buffers.

## Diagnostic Bundle

The diagnostic builder is allowlist-based and sanitizes before writing. Allowed entries are bounded application/platform/configuration/log/error/runtime/migration/backend/project/interaction/validation summaries plus a manifest and sanitization version. Vaults, secret databases/blobs, cookies, tokens, proxy credentials, browser profiles/cache/storage, screenshots marked sensitive, HTML/API bodies, raw SQLite, archives, crash dumps, and temporary secret files are excluded. The ZIP uses safe relative names, count/size limits, atomic promotion, and staging cleanup.
