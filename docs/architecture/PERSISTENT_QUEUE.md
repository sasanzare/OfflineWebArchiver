# Persistent Page Job Queue

## Product Phase 7 ownership

Queue state machine version 2 adds logical `interrupted` and `paused` while terminal states remain completed/failed/skipped/blocked. Application Service claims through a Lease, and terminal writes for generation greater than zero require active token/fencing/expiry ownership. Recovery preserves attempt and transition history and safely requeues interrupted/paused work.

## Purpose and boundary

Product Phase 6 established durable local Page Jobs; Product Phase 7 retains those invariants and adds Lease/Fencing/Checkpoint/Recovery ownership. `@offline-web-archive/queue` owns pure state, priority, retry, limit, redaction, and idempotency rules. Archive Core owns public ports; SQLite owns transactions; Application Service owns checks/orchestration; contract `1.4.0` is the only CLI/Desktop boundary.

No component in this phase fetches a URL, discovers links, renders a page, stores page output, starts a Worker, expires a claim, or recovers an abandoned Job.

## Workflows

Enqueue evaluates the candidate with the current Profile revision and Scope Engine version, checks the persisted identity count, opens `BEGIN IMMEDIATE`, persists the Scope Decision, finds or inserts the logical Job, records discovery evidence and the creation transition, then commits. Batch enqueue is best-effort in stable input order with one bounded transaction per item and explicit counts.

Claim uses one immediate transaction and orders eligible `pending` Jobs by priority descending, eligibility time ascending, depth ascending, queue sequence ascending, then Job ID ascending. The successful update creates one UUID claim token and one attempt.

Complete and fail require the active claim token. Completion stores only bounded `queue-test` metadata. Retryable failure moves to `retrying` while attempts remain; release is a separate persisted, deterministic operation. Skip and block retain the Job and transition history.

## Persistence and ownership

SQLite schema 4 and migration `004_add_persistent_page_queue` add Scope snapshots, Page Jobs, attempts, transitions, discovery relationships, and idempotency operations. Project, Run, Profile revision, engine version, and Project revision ownership is checked before mutation. A verified backup precedes forward migration; failure rolls back the migration or queue transaction.

## Statistics

The operational view reports total, every state count, due/exhausted retry counts, maximum/average depth, oldest pending time, newest Job time, and duplicate discovery count. These are queue statistics, never archive coverage.

## Product Phase 7 integration

Product Phase 7 may add Lease ownership, Heartbeats, expiration, Checkpoints, Pause/Resume, and crash recovery. It must preserve Phase 6 logical identity, claim-token protection, idempotency records, attempt numbering, transition history, and terminal-state rules.
