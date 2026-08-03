# Phase 6 Diagnostic Catalog

| Code range | Layer | Severity | Trigger | Remediation |
|---|---|---|---|---|
| `OKF-OFFICIAL-001..013` | Official | Error | Invalid Concept or reserved-file structure | Correct the official artifact structure. |
| `OKF-POLICY-001..019` | Policy | Error | Metadata, provenance, actor, freshness, or lifecycle violation | Correct repository-owned metadata. |
| `OKF-EXT-001` | Extension | Error | Retained custom validator finding | Correct manifest, registry, evidence, or mapping data. |
| `OKF-QUALITY-001` | Quality | Warning | Broken internal Markdown link | Correct the link or document the target. |
| `OKF-FORMAT-001..002` | Format | Warning | Field order or trailing whitespace | Normalize the Markdown explicitly. |

Codes are emitted in deterministic file, layer, code, and message order. Every active code is exercised by production validation or focused tests.
