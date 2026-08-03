# Phase 7 Quality Gate Policy

| Layer | CI behavior | Exit behavior | Artifact output | Escalation |
|---|---|---|---|---|
| Official OKF v0.2 | Blocking | Error fails job | JSON diagnostics | Correct `OKF-OFFICIAL-*`. |
| Repository metadata policy | Blocking | Error fails job | JSON diagnostics | Correct `OKF-POLICY-*`. |
| OfflineWebArchiver extensions | Blocking | Error fails job | JSON diagnostics | Correct `OKF-EXT-*`. |
| Formatting | Blocking through `format:check` | Failure fails job | Job log | Normalize without semantic change. |
| Knowledge quality | Non-blocking | Warnings do not fail job | JSON diagnostics | Review `OKF-QUALITY-*`. |
| Internal validator failure | Blocking | Non-zero exit fails job | Job log and artifact when generated | Repair validator with regression coverage. |

Strict quality is not enabled. Changing warning severity requires an approved contract amendment.
