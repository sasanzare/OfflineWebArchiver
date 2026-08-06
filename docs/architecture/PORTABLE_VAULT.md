# Portable Vault

## On-disk format

The portable adapter stores one versioned JSON Vault at:

```text
<project>/secrets/portable-vault.json
```

The directory is application-owned. The header contains a magic value, format version, Vault and Project identities, timestamps, generation, validated scrypt configuration, and the wrapped master key. Each record contains safe metadata, a wrapped DEK, and an authenticated encrypted payload. Secret payloads are never stored in SQLite or ordinary Project archives.

Unknown fields, prototype-pollution keys, duplicate secret IDs, duplicate nonces, malformed metadata, invalid project scope, invalid timestamps, unsupported envelopes, truncation, and excessive size/count are rejected.

## Persistence and concurrency

Writes use an application-owned lock file, stale-lock detection, a random restrictive temporary file, `fsync` before promotion, atomic rename, directory synchronization where supported, and a read-back validation of the promoted Vault. Generation checks detect an external change while the Vault is unlocked instead of silently overwriting a newer file. Stale staging files are cleaned only in the owned Vault directory.

The protocol is crash-safe at the application level but cannot promise storage-media guarantees on every filesystem. It preserves the last valid promoted Vault and documents that overwrite/unlink is not guaranteed secure erasure on SSD or copy-on-write storage.

## Lifecycle

The adapter reports `uninitialized`, `locked`, `unlocking`, `unlocked`, `rotating`, and `error`. Unlock failures are safe and rate-limited; successful use refreshes an inactivity timer; lock and fatal errors clear the master key and reject secret resolution. Metadata/status inspection remains safe while locked, but decryption and mutation require an unlocked store.

The OS-protected adapter uses the same record format in `secrets/os-vault.json` after its provider protects the root key. See [OS-protected storage](SECRET_OS_STORAGE.md).
