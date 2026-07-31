# Project Locking

The application policy is one Project writer. `.project.lock` version 1 records a random instance, PID, hostname, operation, and UTC creation time. Exclusive creation establishes ownership. Active same-host and all other-host locks fail with stable `PROJECT_LOCKED`; malformed records fail with `PROJECT_LOCK_INVALID`. Only a same-host PID proven absent is stale and reclaimable. Release rereads the record and removes it only when the instance ID still matches.

Open holds the lock through close. Migration uses the lock plus `BEGIN IMMEDIATE`. Export reuses an already-open lock or takes a temporary lock. Desktop keeps an open session and closes during normal application shutdown. CLI `project open` is an intentional open/check/migrate/close one-shot; CLI export opens/closes around export. Simultaneous Desktop/CLI use produces an actionable conflict instead of another writer.

This file is coordination metadata, not access control. A hostile local filesystem peer, PID reuse, network filesystems, crashes during OS shutdown, and distributed writers are outside its security guarantee. Stale-lock policy is conservative and lock files are never exported.
