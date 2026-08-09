# Acceptance Metrics

Phase 13 defines versioned metric IDs for future archive evidence:

| Metric | Formula | Classification notes |
| --- | --- | --- |
| `ACM-P13-001` Eligible Page Coverage | archived eligible pages / eligible in-scope pages | Separate archived, skipped, scope-blocked, unreproducible, known limitation, and unexpected failure. |
| `ACM-P13-002` Offline Render Success | successful strict-offline renders / archived pages selected for render | Replay misses and unsupported workers are observable failures, not successes. |
| `ACM-P13-003` Local Asset Resolution | resolved local asset references / asset references observed | Unknown or external references remain counted. |
| `ACM-P13-004` Broken Internal Navigation | broken internal links / internal links tested | Redirect and scope-blocked cases are separate classifications. |
| `ACM-P13-005` External Network Leakage | external requests observed in strict mode | Target is zero; local loopback runtime is not external leakage. |
| `ACM-P13-006` Replay Determinism | identical replay outcomes across repeated runs / repeated replay cases | Match key, policy, browser/runtime, and fixture versions are recorded. |

These metrics are contracts only. No full archive dataset or replay engine is
claimed in Phase 13.

