# Persistence Knowledge

Product Phase 7 persists Lease ownership using a token verifier and Fencing Generation, immutable Checkpoints, cooperative Run control, bounded resumable recovery reports/cursors, completed-output verification state, and clean/unclean execution sessions. Phase 6 compatibility/idempotency rows retain active credentials for durable claim replay, making Project database confidentiality an explicit residual concern. Retention remains open.

Product Phase 6 persists Queue Scope Decisions, Page Jobs, attempts, transitions, discoveries, and idempotency results under the Project lock and short SQLite immediate transactions. Identity uniqueness, ownership, attempt numbering and states are database constrained; Queue state is included in bounded export/import and survives reopen.

Verified Phase 4 persistence includes atomic files/directory promotion, SQLite repository operations, portable ZIP import/export, and single-writer lock coordination. Security/portability limitations are authoritative in the Phase 4 review and ADR-012..014.
