# Secret Cryptography

## Envelope

The version-1 envelope uses AES-256-GCM with a fresh random 12-byte nonce and a 16-byte authentication tag. The algorithm, envelope version, nonce, ciphertext, and tag are validated before decryption. Associated authenticated data binds the envelope to its purpose and the canonical metadata that governs it.

Authentication failure, unknown algorithms, unsupported versions, malformed encodings, nonce reuse within a Vault, and size violations fail closed with a safe `SecretStoreError`; plaintext is not returned in the error.

## Key derivation

Portable Vault passphrases are validated as mutable bytes and derive a 32-byte key with versioned scrypt parameters. The production profile is `N=32768`, `r=8`, `p=1`, `maxmem=128 MiB`, with a fresh 16-byte salt. The test profile is explicitly separate (`N=1024`, `r=8`, `p=1`, `maxmem=32 MiB`) and is reachable only through test-mode construction.

Vault headers carry the KDF name, version, salt, and parameters. Bounds on cost, memory, record count, Vault size, export size, secret size, and passphrase size are checked before expensive work. The parser never accepts arbitrary KDF settings from an untrusted file.

## Memory handling

The implementation prefers mutable byte buffers, copies input values only for the operation lifetime, clears store-owned plaintext, DEK, KEK, master-key, and passphrase buffers where practical, and clears decrypted caches on lock. JavaScript and native runtime copies mean zeroization cannot be guaranteed; the primary control is minimizing plaintext exposure and avoiding plaintext files/serialization.

See [Secret Key Hierarchy](SECRET_KEY_HIERARCHY.md) for wrapping and rotation semantics.
