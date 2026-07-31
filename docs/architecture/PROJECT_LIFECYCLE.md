# Project Lifecycle

After Project creation/open, Profile commands maintain immutable revisions. Scope commands compute local decisions. Queue commands validate the current Project/Run/Profile/revision/engine and mutate the schema-4 ledger through the same bounded open/close orchestration. A Queue command does not start a network request or real crawler.

## Create

Refuse an existing final destination; create a unique sibling staging directory; build approved directories; generate UUID Project/Revision/Run identities and UTC time; create/migrate SQLite; insert consistent metadata/Revision/Run/event rows; checkpoint/close; atomically write strict manifest; fully validate; atomically promote. Failure removes staging and never overwrites.

## Open

Read and validate manifest/filesystem/database compatibility before mutation. Acquire the writer lock. Open configured SQLite, verify migration history, create backup before pending migration, migrate transactionally, synchronize metadata/manifest last-open/schema/lifecycle values, record event, and retain connection/lock. Unsupported format/schema or checksum fails without mutation.

## Validate and compatibility

Validation is read-only and reports structured issues by manifest, compatibility, filesystem, database, migration, identity, and security categories. It checks required directories, symlinks, SQLite integrity, migration history, `user_version`, and manifest/metadata identity. An older supported schema is valid with a migration warning.

## Close

Record a close event, checkpoint WAL, atomically mark manifest closed, close the database, and release only the owned lock. Close failures are surfaced and cleanup is still attempted.

## Export and import

See [Project Import and Export](PROJECT_IMPORT_EXPORT.md). Identity and relative references survive the round trip; imported Projects are closed and must be opened before mutation.

## Interfaces

Contract `1.3.0` retains Project/Profile/Scope operations and adds Queue operations. Application Service is the only orchestration entry point. Desktop uses sender/frame/URL-authorized IPC plus main-process path grants from native dialogs. CLI exposes human/JSON output and stable exit codes. Queue claims are controlled state simulations; none of these commands performs a crawl or network request. Close/reopen preserves processing Jobs without recovering them.
