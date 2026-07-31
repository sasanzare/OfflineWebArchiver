# Logging and Observability

Structured JSON events contain UTC time, level, component, correlation ID, optional command ID, event name, bounded metadata, and optional error code. Service emits command start/completed/failed. Persistence emits Project lifecycle, validation, migration duration, backup, export/import count/bytes/checksum, and lock-relevant outcomes.

Logs never include Project host path, manifest/database content, SQL data, archive payload, or secrets. Secret-like metadata keys are recursively redacted and circular values bounded. CLI/Desktop write development logs to stderr. No Project log sink, remote telemetry, analytics, retention, or external service is approved in Phase 4.
