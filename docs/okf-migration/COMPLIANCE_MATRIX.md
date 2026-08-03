# Official OKF v0.2 Compliance Matrix

## Phase 5 update

Migrated Concept and reserved-file content meets the frozen producer contract by temporary audit. Official production validation, CI enforcement, and final whole-tree conformance remain deferred and must not be reported as complete.

The evidence below reflects the repository at baseline commit `dd0fb00fd869dee2a808f48fc157f45c00c98cb0`. `UNKNOWN` is used only where the audit cannot establish a result.

| ID | Requirement | Level | Repository evidence | Current result | Gap | Required migration action | Target phase |
|---|---|---|---|---|---|---|---|
| OKF-REQ-001 | Bundle is a Markdown directory tree. | Mandatory | `okf/` contains 58 Markdown files plus JSON registries. | PARTIALLY_COMPLIANT | Markdown exists but custom JSON is the active model. | Establish official bundle boundary without deleting extensions. | 2 |
| OKF-REQ-002 | Every non-reserved Markdown file has parseable YAML. | Mandatory | Audit of all `okf/**/*.md`: 58 files, zero frontmatter blocks. | NON_COMPLIANT | All current Markdown needs future classification before conversion. | Define frontmatter contract and migrate concepts incrementally. | 3-5 |
| OKF-REQ-003 | Every concept has non-empty `type`. | Mandatory | No current `okf/**/*.md` frontmatter or `type` fields. | NON_COMPLIANT | No official concept typing exists. | Add only after classification and taxonomy review. | 3-5 |
| OKF-REQ-004 | Reserved files follow `index.md`/`log.md` rules. | Mandatory | `okf/` has no `index.md` or `log.md`; many `README.md` files act as custom records. | PARTIALLY_COMPLIANT | No reserved-file misuse, but no official index/log model. | Introduce reserved files in target structure only. | 2, 4 |
| OKF-REQ-005 | Actor syntax is used when generated/verified exists. | Mandatory when fields present | Official fields are absent; custom `VERIFIED` is a status label. | NOT_APPLICABLE | No official actor fields yet. | Define actor ownership and metadata generation rules. | 3 |
| OKF-REQ-006 | `sources[].resource` is present when sources exists. | Mandatory when field present | No official `sources` fields; `registry/evidence.json` has project-local path evidence. | NOT_APPLICABLE | Evidence is not official provenance. | Bridge evidence mappings to optional source metadata where appropriate. | 5 |
| OKF-REQ-007 | Attested Computation has runtime. | Mandatory when type used | No official concepts use this type. | NOT_APPLICABLE | No computation migration proposed yet. | Evaluate only if the future bundle needs such concepts. | 5 |
| OKF-REC-001 | Root index may declare `okf_version: "0.2"`. | Optional | No `index.md`; `manifest.json` has custom `frameworkVersion`. | NON_COMPLIANT | Custom version is not official declaration. | Add root official index in Phase 4. | 4 |
| OKF-REC-002 | Recommended concept metadata is available. | Recommended | Narrative titles exist as Markdown headings; no frontmatter. | PARTIALLY_COMPLIANT | Values are not machine-readable official metadata. | Promote selected headings into frontmatter later. | 3-5 |
| OKF-REC-003 | Status uses `draft`, `stable`, `deprecated`. | Optional with defined semantics | `OKF_STATUSES` in `tools/okf/validate.mjs` uses nine custom uppercase values. | NON_COMPLIANT | Custom states mix multiple dimensions. | Preserve them as extension fields; map lifecycle separately. | 3 |
| OKF-REC-004 | Links are standard Markdown and broken links tolerated. | Recommended/permissive | `tools/docs/validate.mjs` checks all relative Markdown links and fails broken links. | PARTIALLY_COMPLIANT | Existing project policy is stricter than official consumer permissiveness. | Keep strict project policy as an extension check. | 6 |
| OKF-EXT-001 | Unknown fields/types are tolerated. | Extension behavior | Current JSON schemas reject extra manifest/registry properties; no frontmatter parser exists. | NON_COMPLIANT | Existing custom schema is intentionally closed. | Official validator must be permissive; extension validator may be strict for extension JSON. | 6 |
| OKF-REC-005 | Indexes support progressive disclosure. | Quality recommendation | `okf/maps/*` and `README.md` documents provide narrative maps, not reserved indexes. | PARTIALLY_COMPLIANT | No standard index traversal. | Add generated/curated directory indexes. | 4 |
| OKF-REC-006 | Provenance/trust/freshness fields have official semantics. | Optional | Existing evidence registry stores path and method, not official source/trust/freshness metadata. | NON_COMPLIANT | Semantics cannot be inferred from custom status. | Define explicit optional metadata and extension bridge. | 3, 5 |

## Phase 3 Design Disposition

Phase 3 does not change the current compliance results because it creates no production bundle. It closes the design action for future migration:

| Requirement family | Frozen design result | Evidence |
|---|---|---|
| Frontmatter and `type` | Four-field repository minimum with official `type` isolated | `METADATA_CONTRACT.md`, proposed Concept schema |
| Reserved files | Root-only version metadata; no directory-index/log frontmatter | `RESERVED_FILE_METADATA_CONTRACT.md` |
| Actors/trust | Canonical actors; generated and verification records separated | `ACTOR_AND_PROVENANCE_MODEL.md` |
| Sources/provenance | Official source structure plus evidence registry bridge | `SOURCE_AND_EVIDENCE_MODEL.md` |
| Lifecycle/freshness | Official lifecycle and absolute staleness separated from project state | `STATUS_AND_LIFECYCLE_MODEL.md`, `FRESHNESS_AND_VERIFICATION_POLICY.md` |
| Unknown fields/types | Official pass/preserve; repository producer policy reported separately | `METADATA_CONTRACT.md` |

At the Phase 3 design baseline, current status remained nonconformant because no production Concepts existed. Phase 4 now reports the reviewed subset separately below; no full-bundle conformance claim is made.

## Phase 4 partial conformance result

Phase 4 creates a reviewed subset at `okf/` under `OKF-P4-A001`. The result is intentionally split by layer:

| Layer | Result | Evidence | Limitation |
|---|---|---|---|
| Migrated core Concepts | CONFORMANT WITH APPROVED REPOSITORY CONTRACT | 21 new Concepts with parseable frontmatter, approved types, canonical field order, portable sources, and separated `owa` state | Manual Phase 4 checks precede the Phase 6 production validator. |
| Root and directory indexes | CONFORMANT WITH RESERVED-FILE CONTRACT | `okf/index.md` plus six generated-style directory indexes | The realized root is covered by the explicit Phase 4 amendment. |
| Remaining legacy Markdown | NON_COMPLIANT FOR OFFICIAL FULL-BUNDLE CHECK | 58 pre-existing Markdown files remain unchanged; most have no official frontmatter | Phase 5 must migrate or explicitly retain every remaining map row. |
| Project extensions and registries | PRESERVED; SEPARATE VALIDATION | Existing manifest, eight registries, evidence, maps, and validator paths are unchanged | The extension bridge and relocation are Phase 5-6 work. |
| Full-bundle conformance | NOT ACHIEVED | Partial core only; no current full-bundle validator | Do not claim repository-wide OKF v0.2 conformance. |
