# Error Model

Every public error contains stable code/category, safe internal message, English user message, retryability, optional bounded details, and optional cause ID. Raw exceptions, stack traces, SQL, archive payload, host environment, and credentials never cross the response boundary.

Contract and authorization codes remain from Phase 3. Phase 4 adds stable Project not-found/existing/manifest/format/database/integrity/schema/migration/checksum/backup/lock/not-open/validation/export/import/archive-limit/atomic-write codes. Persistence translates lower-level format, SQLite, ZIP, and filesystem errors into the Core-owned Project error set; Application Service translates that set into contract errors.

CLI exits: `0` success, `2` usage, `3` contract, `4` validation/security/incompatibility, `5` application, `70` internal. A validation command can return a structured report and exit 4 when `valid=false`.
