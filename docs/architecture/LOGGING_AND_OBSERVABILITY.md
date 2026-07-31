# Logging and Observability

One structured JSON event contains timestamp, level, component, correlation ID, optional command ID, event name, optional metadata, and optional error code. Application Service emits start/completed/failed events. The CLI and desktop currently write logs to stderr.

Metadata keys matching authorization, cookie, credential, OTP, password, proxy password, secret, session, or token are recursively redacted; circular values are bounded. No durable telemetry, analytics, retention, or external sink is authorized in Phase 3.
