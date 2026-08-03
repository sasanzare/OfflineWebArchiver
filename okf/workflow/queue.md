---
type: Workflow
title: Queue
description: Defines durable Page Job identity, ordering, idempotency, and protected completion behavior.
tags: [workflow, queue, jobs, idempotency]
status: stable
sources:
  - id: queue-domain-source
    resource: packages/queue/src/index.ts
    title: Queue domain source
  - id: queue-persistence-source
    resource: packages/persistence-sqlite/src/queue.ts
    title: Queue persistence source
  - id: queue-lifecycle-tests
    resource: tests/integration/queue-lifecycle.test.ts
    title: Queue lifecycle integration tests
owa:
  implementation_status: implemented
  verification_status: verified
  requirement_ids: [FR-QUEUE-001, FR-QUEUE-002, FR-QUEUE-003, FR-RECOVERY-001]
  acceptance_ids: [AC-P06-001, AC-P06-035, AC-P07-002, AC-P07-016, AC-P07-034]
  decision_ids: [OD-036, OD-037, OD-039, OD-040, OD-041, OD-042, OD-043, OD-044, OD-048, OD-054]
  risk_ids: [R-056, R-058, R-059, R-061, R-062, R-063, R-064, R-065, R-066, R-069, R-070, R-073]
  evidence_ids: [OKF-EV-P06-DOMAIN, OKF-EV-P06-PERSISTENCE, OKF-EV-P06-INTEGRATION, OKF-EV-P06-CONCURRENCY, OKF-EV-P07-PERSISTENCE]
  legacy_ids: [OKF-DOM-044]
---

# Queue

The queue persists normalized Page Job identities, deterministic priority, idempotency, attempts, and history. A stable logical identity combines Project, Run, Profile revision, normalization engine, identity hash, and Page type. Ordering is priority descending, due time ascending, depth ascending, insertion sequence ascending, and Job UUID ascending.

Claims are atomic and token-fenced. Attempts increment only on a committed claim, and completion, failure, retry, skip, or block histories survive Project reopen. Discovery provenance retains source, parent, type, and depth with a minimum effective Job depth. The [Page Job State Machine](job-state-machine.md) defines transitions, while [Leases](../recovery/leases.md) and [Fencing](../recovery/fencing.md) protect later writes.

Phase 8 rendering may process only an eligible existing queued Job through the [Rendering](rendering.md) workflow. Automatic discovery, automatic enqueue, a production downloader, and a Worker Pool remain outside this Concept.

