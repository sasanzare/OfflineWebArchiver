# Logging and Observability

## Recovery observability

Safe events include Project/Run/Job/Lease IDs, owner ID, Fencing Generation, state, operation ID, timestamps, bounded counters, and reason codes. Lease Tokens, token hashes, Checkpoint payload values, raw filesystem roots, output bytes, and sensitive URLs are never logged. Execution-session rows distinguish clean close from unclean detection but are advisory alongside Lease/Job facts.

Structured JSON events contain UTC time, level, component, correlation ID, optional command/operation ID, event name, bounded metadata, and optional error code. Service emits command start/completed/failed. Phase 6 adds Queue requested/completed/conflict/transaction/discovery events containing safe Job/Project/Run/state/count/reason identifiers only. Persistence continues emitting lifecycle, migration, backup, export/import, Profile revision/hash, and lock outcomes.

Logs never include Project host path, raw/resolved/normalized/identity URLs, fragments, query values, claim/completion/idempotency tokens, result/error bodies, manifest/database content, SQL data, archive payload, or secrets. Secret-like metadata keys are recursively redacted and circular values bounded. Queue persistence explicitly redacts failure/result summaries before storage and logging. CLI/Desktop write development logs to stderr. No Project log sink, remote telemetry, analytics, retention, or external service is approved in Phase 6.
