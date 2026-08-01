# Application Service Knowledge

Contract 1.4 recovery commands are orchestrated here: Lease claim/heartbeat/renew/release, owner-fenced terminal writes, Checkpoints, artifact/output descriptors, inspection/apply/report, Pause/Resume, and safe error translation. Only the owner claim result and protected mutation inputs carry a token; safe events, logs, and ordinary inspection/list/report results do not.

The local Application Service validates contract 1.4.0, authorizes local transports, orchestrates Project/Profile/Scope/Queue/Recovery persistence and policy, revalidates ownership/revisions/identity/Lease/fencing, translates stable errors, emits safe token-free events, and preserves correlation/operation identifiers. Use cases are local durable state operations; they do not dispatch network or crawl work.
