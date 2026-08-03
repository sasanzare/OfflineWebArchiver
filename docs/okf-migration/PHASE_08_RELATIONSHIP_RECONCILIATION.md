# Phase 8 Relationship Reconciliation

Audit date: 2026-08-03

The registry contains 61 unique typed relationships. Every source and target resolves to a retained registry or authority ID. Typed extension edges are retained because ordinary Markdown links do not encode `satisfies`, `evidenced-by`, `owns`, `implements`, or `exposes` semantics. They supplement rather than override human-readable Markdown.

| Relationship ID | Type | Source | Target | Representation | Resolution | Final action |
|---|---|---|---|---|---|---|
| `OKF-REL-001` | `satisfies` | `OKF-NODE-P03-ARCHITECTURE` | `NFR-MAINT-001` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-002` | `evidenced-by` | `OKF-NODE-P03-ARCHITECTURE` | `OKF-EV-P03-TESTS` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-003` | `depends-on` | `OKF-DOM-006` | `OKF-NODE-P04-CONTRACT-1-1` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-004` | `depends-on` | `OKF-DOM-007` | `OKF-NODE-P04-CONTRACT-1-1` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-005` | `owns` | `OKF-DOM-005` | `OKF-NODE-P04-PERSISTENCE` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-006` | `depends-on` | `OKF-PHASE-004` | `OKF-PHASE-003` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-007` | `satisfies` | `OKF-NODE-P04-PERSISTENCE` | `FR-PROJECT-001` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-008` | `satisfies` | `OKF-NODE-P04-PERSISTENCE` | `FR-PROJECT-002` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-009` | `satisfies` | `OKF-NODE-P04-SQLITE-2` | `FR-PROJECT-003` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-010` | `satisfies` | `OKF-NODE-P04-ZIP-1` | `FR-PROJECT-004` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-011` | `evidenced-by` | `OKF-NODE-P04-FORMAT-1` | `OKF-EV-P04-FORMAT` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-012` | `evidenced-by` | `OKF-NODE-P04-SQLITE-2` | `OKF-EV-P04-TESTS` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-013` | `evidenced-by` | `OKF-NODE-P04-ZIP-1` | `OKF-EV-P04-SECURITY` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-014` | `depends-on` | `OKF-NODE-P05-PROFILE-SCOPE-URL` | `OKF-NODE-P04-PERSISTENCE` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-015` | `depends-on` | `OKF-PHASE-005` | `OKF-PHASE-004` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-016` | `satisfies` | `OKF-NODE-P05-PROFILE-1` | `FR-AUTHZ-001` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-017` | `satisfies` | `OKF-NODE-P05-SCOPE-1` | `FR-SCOPE-001` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-018` | `satisfies` | `OKF-NODE-P05-SCOPE-1` | `FR-SCOPE-002` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-019` | `satisfies` | `OKF-NODE-P05-SECURITY` | `FR-SCOPE-003` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-020` | `evidenced-by` | `OKF-NODE-P05-PROFILE-1` | `OKF-EV-P05-PERSISTENCE` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-021` | `evidenced-by` | `OKF-NODE-P05-SCOPE-1` | `OKF-EV-P05-GOLDEN` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-022` | `evidenced-by` | `OKF-NODE-P05-SQLITE-3` | `OKF-EV-P05-PERSISTENCE` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-023` | `depends-on` | `OKF-DOM-006` | `OKF-NODE-P05-CONTRACT-1-2` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-024` | `depends-on` | `OKF-DOM-007` | `OKF-NODE-P05-CONTRACT-1-2` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-025` | `owns` | `OKF-DOM-005` | `OKF-NODE-P05-PROFILE-SCOPE-URL` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-026` | `depends-on` | `OKF-PHASE-006` | `OKF-PHASE-005` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-027` | `depends-on` | `OKF-NODE-P06-QUEUE` | `OKF-NODE-P05-SCOPE-1` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-028` | `satisfies` | `OKF-NODE-P06-QUEUE` | `FR-QUEUE-001` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-029` | `satisfies` | `OKF-NODE-P06-QUEUE` | `FR-QUEUE-002` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-030` | `satisfies` | `OKF-NODE-P06-STATE-1` | `FR-QUEUE-003` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-031` | `evidenced-by` | `OKF-NODE-P06-QUEUE` | `OKF-EV-P06-CONCURRENCY` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-032` | `evidenced-by` | `OKF-NODE-P06-SQLITE-4` | `OKF-EV-P06-INTEGRATION` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-033` | `owns` | `OKF-DOM-005` | `OKF-NODE-P06-QUEUE` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-034` | `depends-on` | `OKF-DOM-006` | `OKF-NODE-P06-CONTRACT-1-3` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-035` | `depends-on` | `OKF-DOM-007` | `OKF-NODE-P06-CONTRACT-1-3` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-036` | `depends-on` | `OKF-NODE-P07-RECOVERY` | `OKF-NODE-P06-QUEUE` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-037` | `satisfies` | `OKF-NODE-P07-RECOVERY` | `FR-RECOVERY-001` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-038` | `evidenced-by` | `OKF-NODE-P07-LEASES` | `OKF-EV-P07-CONCURRENCY` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-039` | `evidenced-by` | `OKF-NODE-P07-RECOVERY` | `OKF-EV-P07-PROCESS-KILL` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-040` | `evidenced-by` | `OKF-NODE-P07-CHECKPOINTS` | `OKF-EV-P07-LIFECYCLE` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-041` | `depends-on` | `OKF-NODE-P07-RUN-CONTROL` | `OKF-NODE-P07-CHECKPOINTS` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-042` | `evidenced-by` | `OKF-NODE-P07-OUTPUT` | `OKF-EV-P07-RANGE` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-043` | `implements` | `OKF-NODE-P07-SQLITE-5` | `OKF-NODE-P07-RECOVERY` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-044` | `exposes` | `OKF-NODE-P07-CONTRACT-1-4` | `OKF-NODE-P07-RECOVERY` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-045` | `depends-on` | `OKF-NODE-P07-INTERFACES` | `OKF-NODE-P07-CONTRACT-1-4` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-046` | `owns` | `OKF-DOM-005` | `OKF-NODE-P07-RECOVERY` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-047` | `depends-on` | `OKF-DOM-006` | `OKF-NODE-P07-CONTRACT-1-4` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-048` | `depends-on` | `OKF-DOM-007` | `OKF-NODE-P07-CONTRACT-1-4` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-049` | `evidenced-by` | `OKF-PHASE-007` | `OKF-EV-P07-RECORD` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-050` | `depends-on` | `OKF-NODE-P08-BROWSER-RENDER` | `OKF-NODE-P05-SCOPE-1` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-051` | `depends-on` | `OKF-NODE-P08-BROWSER-RENDER` | `OKF-NODE-P06-QUEUE` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-052` | `depends-on` | `OKF-NODE-P08-BROWSER-RENDER` | `OKF-NODE-P07-RECOVERY` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-053` | `satisfies` | `OKF-NODE-P08-BROWSER-RENDER` | `FR-RENDER-001` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-054` | `satisfies` | `OKF-NODE-P08-RUNTIME-NETWORK` | `FR-SCOPE-003` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-055` | `evidenced-by` | `OKF-NODE-P08-FENCED-RESULTS` | `OKF-EV-P08-FAULTS` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-056` | `implements` | `OKF-NODE-P08-SQLITE-6` | `OKF-NODE-P08-FENCED-RESULTS` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-057` | `exposes` | `OKF-NODE-P08-CONTRACT-1-5` | `OKF-NODE-P08-BROWSER-RENDER` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-058` | `owns` | `OKF-DOM-005` | `OKF-NODE-P08-BROWSER-RENDER` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-059` | `depends-on` | `OKF-DOM-006` | `OKF-NODE-P08-CONTRACT-1-5` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-060` | `depends-on` | `OKF-DOM-007` | `OKF-NODE-P08-CONTRACT-1-5` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |
| `OKF-REL-061` | `evidenced-by` | `OKF-PHASE-008` | `OKF-EV-P08-RECORD` | Retained as extension graph data | Source and target resolve; no conflict | Retain typed edge |

## Markdown relationship audit

- Markdown links checked: 159.
- Broken internal links: 0.
- Conflicting registry edges: 0.
- Duplicate relationship IDs: 0.
- Obsolete or unresolved relationships: 0.
- Duplicate and removable definitions: 0; the registry adds typed semantics not encoded by Markdown URLs.
