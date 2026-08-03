# Final Google OKF v0.2 Compliance Matrix

Audit date: 2026-08-03

Normative source: [Google Open Knowledge Format v0.2 specification](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)

The official source was reverified during Phase 8. Results below apply only to the official Markdown bundle; repository policy, extension integrity, quality, and formatting are reported separately.

| ID | Official requirement | Applicability | Independent evidence | Final value |
|---|---|---|---|---|
| OKF-REQ-001 | Bundle is a Markdown directory tree | Mandatory | `okf/` contains a root index and subject-directory Markdown; extension artifacts are classified separately | COMPLIANT |
| OKF-REQ-002 | Every non-reserved Markdown Concept has parseable YAML frontmatter | Mandatory | Independent parse and production validator covered all 40 Concepts | COMPLIANT |
| OKF-REQ-003 | Every Concept has a non-empty string `type` | Mandatory | 40 of 40 Concepts passed; no empty or non-string type | COMPLIANT |
| OKF-REQ-004 | Reserved `index.md` and `log.md` files use their defined structures | Mandatory when present | One root index and nine directory indexes pass; no log exists | COMPLIANT |
| OKF-REQ-005 | `generated` and `verified` actors follow official conventions when present | Conditional | All present records passed actor and timestamp structure checks | COMPLIANT |
| OKF-REQ-006 | Every `sources` item has a `resource` | Conditional | All present source items passed structure checks | COMPLIANT |
| OKF-REQ-007 | `Attested Computation` declares `runtime` | Conditional | No Concept uses `Attested Computation` | NOT_APPLICABLE |
| OKF-RES-001 | Only a root index may carry frontmatter, limited to `okf_version` | Conditional | Root has only quoted `okf_version: "0.2"`; directory indexes have no frontmatter | COMPLIANT |
| OKF-RES-002 | Directory indexes are navigation, not Concepts | Conditional | Nine indexes are classified as reserved navigation with no Concept metadata | COMPLIANT |
| OKF-RES-003 | Log entries use date structure and newest-first prose | Conditional | No `log.md` exists | NOT_APPLICABLE |
| OKF-LIFE-001 | Optional lifecycle status uses official semantics | Conditional | Present statuses pass official values; project states are isolated under `owa` | COMPLIANT |
| OKF-META-001 | Optional `generated`, `verified`, `sources`, and `stale_after` structures are valid | Conditional | Official layer and independent metadata audit agree | COMPLIANT |
| OKF-EXT-001 | Unknown types and fields are tolerated by official consumers | Mandatory consumer behavior | Official validator has permissive coverage; repository restrictions are a separate layer | COMPLIANT |
| OKF-LINK-001 | Relationships use Markdown links; broken links do not determine official conformance | Format behavior | Standard Markdown links are used; stricter zero-broken-link result is reported as repository quality | COMPLIANT |
| OKF-DISC-001 | Indexes support progressive disclosure | Recommended | Root-to-Concept audit reaches all 40 Concepts through nine directory indexes | COMPLIANT |

## Separate project results

| Layer | Result | Evidence |
|---|---|---|
| OfflineWebArchiver metadata policy | PASS | `npm run okf:validate`; 26 policy diagnostics covered by tests |
| OfflineWebArchiver extension integrity | PASS | Manifest, eight registries, and two production schemas validated |
| Knowledge quality | PASS | Zero broken links and zero unreachable Concepts |
| Formatting | PASS | Canonical field order and trailing-whitespace checks |

Final official conclusion: **CONFORMANT**. JSON registries, closed taxonomy, H1/title rules, portable-path rules, and link reachability are useful project controls but are not mislabeled as official Google requirements.
