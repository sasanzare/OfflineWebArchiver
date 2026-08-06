# Secret Key Hierarchy

The Portable Vault uses envelope encryption:

```text
Portable Vault passphrase
        |
        v
   scrypt KEK
        |
        v
authenticated wrapper for the Vault master key
        |
        v
per-record DEK wrapper
        |
        v
AES-256-GCM Secret payload
```

The passphrase-derived KEK is not stored. The random Vault master key is wrapped by that KEK and bound to the Vault identity, Project identity, KDF header, and format. Each record receives a fresh random DEK; the DEK is wrapped by the master key and the payload is authenticated against canonical record metadata.

Secret replacement and cryptographic secret rotation generate fresh record encryption material while preserving the reference. Vault protection rotation decrypts records only in the privileged store, creates a fresh KDF salt and master key, re-encrypts/wraps the records, verifies the new Vault, and atomically promotes it. The old plaintext is cleared; no plaintext rollback file is kept.

The key hierarchy is intentionally independent of future authentication, session, OTP, or proxy protocols. Those later features receive a reference and a purpose, not knowledge of the storage format.
