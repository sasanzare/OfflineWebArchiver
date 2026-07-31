# Persistence Knowledge

Product Phase 6 persists Queue Scope Decisions, Page Jobs, attempts, transitions, discoveries, and idempotency results under the Project lock and short SQLite immediate transactions. Identity uniqueness, ownership, attempt numbering and states are database constrained; Queue state is included in bounded export/import and survives reopen.

Verified Phase 4 persistence includes atomic files/directory promotion, SQLite repository operations, portable ZIP import/export, and single-writer lock coordination. Security/portability limitations are authoritative in the Phase 4 review and ADR-012..014.
