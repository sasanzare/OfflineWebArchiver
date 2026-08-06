# Project Import and Export

Product Phase 6 includes the validated secret-free `profile/config.json`, Profile revision ledger, and schema-4 Queue/Scope/attempt/transition/discovery/idempotency ledgers in the bounded Project archive. Product Phase 11 adds a separate Secret Store boundary: `secrets/`, `secure-exports/`, `diagnostics/`, `auth/`, and `proxies/` remain excluded from ordinary export. Import preserves only safe opaque references/metadata when present; it never resolves a source-machine reference to an unrelated local secret.

The working Project remains a directory. Portable export is bounded ZIP container `1.0.0` using pure-JavaScript `fflate@0.8.3`.

Export validates the source, holds/reuses its writer lock, records a lifecycle event, obtains a consistent SQLite backup snapshot, inventories approved files, and writes `.offline-archive-export.json`. Inventory entries contain only relative path, byte length, and SHA-256. ZIP entry time is fixed for reproducibility. The output is atomically written and never overwrites.

Included roots are `project.json`, the database snapshot, `pages`, `assets`, `api`, `runtime`, and `reports`. Excluded are locks, WAL/SHM, temp, logs, database backups, auth, proxies, secrets, secure-exports, diagnostics, and unknown roots.

Import treats ZIP as hostile. Central-directory inspection precedes decompression and rejects traversal, root/drive/UNC paths, backslashes, reserved names, invalid UTF-8, Unicode/case aliases, duplicate names, directory/symlink/special entries, encryption, unsupported methods, multi-disk/ZIP64, undeclared payload, corrupt checksums, parser entry-set disagreement, and configured resource limits. Defaults are 5,000 entries, 256 MiB compressed, 512 MiB expanded, 128 MiB per entry, and ratio 100.

Verified payloads are written to a unique sibling staging directory. Required empty directories are restored, manifest/database/schema/migration/integrity/identity/path validation runs, and promotion happens only afterward. Failed import leaves no final destination. Ordinary Project ZIP encryption/authentication, streaming ZIP64, and secret export remain separate concerns; Product Phase 11 Secure Export is an explicit authenticated encrypted operation and never reuses the ordinary Project archive path.
