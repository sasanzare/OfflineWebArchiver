# Traceability Map

Registry mapping arrays connect nodes, domains, phases, and changes to authoritative requirement, acceptance, risk, and decision identifiers. Relationship records connect architectural nodes to evidence and dependencies.

Markdown Concepts are the human-readable relationship layer; the registry remains the richer extension traceability layer during the compatibility period.

Phase 10 is indexed by `OKF-PHASE-010`, `OKF-CHG-P10-001`, and the
`OKF-NODE-P10-*` records. The interaction, policy, safety, trace, contract, and
discovery-gate nodes map to `AC-P10-001` through `AC-P10-017`; only
`AC-P10-016` is blocked by the missing Phase 9 engine.

Phase 15 is indexed by `OKF-PHASE-015`, `OKF-CHG-P15-001`, and the
`OKF-NODE-P15-*` records. The proxy, health, security, affinity, and exact-HEAD
gate nodes map to `AC-P15-001` through `AC-P15-018`.

Phase 16 is indexed by `OKF-PHASE-016`, `OKF-CHG-P16-001`, and the
`OKF-NODE-P16-*` records. The scheduler, affinity, Browser Runtime, security,
and local knowledge-gate nodes map to `AC-P16-001` through `AC-P16-012`.
Exact clean-HEAD release promotion and authorized target-site evidence remain
separate later gates.

Phase 18 is indexed by `OKF-PHASE-018`, `OKF-CHG-P18-001`, and the
`OKF-NODE-P18-*` records. The Rewriter, route/dependency maps, security,
separate Persistence artifact, and local knowledge-gate nodes map to
`AC-P18-001` through `AC-P18-013`. The records cover the deterministic
stored-content boundary only; Phase 19 runtime/replay and target-site evidence
remain separate later gates.
