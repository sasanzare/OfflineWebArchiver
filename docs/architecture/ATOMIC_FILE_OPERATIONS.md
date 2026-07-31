# Atomic File Operations

The reusable Node adapter follows this protocol:

1. Resolve an exact destination and same-directory unique temporary sibling.
2. Refuse an existing destination unless replacement is explicitly requested.
3. Reject a symlink at a trust-boundary target.
4. Create the temporary file exclusively with mode `0600`.
5. Write, flush, close, rename on the same filesystem, then flush the parent directory where the OS supports it.
6. On failure, remove only the exact owned temporary path and retain the previous final file.

Project create/import use a sibling staging directory, complete structure/database/manifest extraction, perform full validation, and rename only to an absent final directory. Failed operations remove only their unique staging directory.

Windows, Linux, and macOS all support same-filesystem rename, but directory fsync behavior and power-loss durability vary. Network filesystems, hostile concurrent filesystem writers, and volume-level failure are not claimed safe. SQLite backup handles database snapshots; raw copying of an open WAL database is forbidden.
