# Sensitive Temporary Data and Screenshots

Sensitive temporary resources are created only under the application-owned `temp/secret-work` directory with random non-sensitive names and restrictive permissions where supported. Cleanup is bounded to that directory, rejects symlink escapes, removes known stale files at startup, and runs after success, failure, cancellation, and diagnostic/export staging. Best-effort overwrite may be used for small mutable files, but the product does not claim guaranteed secure deletion on SSD or copy-on-write media.

Secret-bearing operations do not create plaintext files by default. Temporary resources are tracked by ownership and cleanup records contain only safe counts/status. Unrelated user files and unvalidated recursive paths are never removed.

Screenshot capture is denied for sensitive operations unless an explicit safe classification is supplied. Unknown or Secret-bearing visual state is treated as sensitive; filenames and metadata cannot contain secret values. Existing optional non-sensitive rendering screenshots remain available, but Phase 11 does not add login or OTP screenshot workflows.
