# Status and Lifecycle Model

## Independent Dimensions

Official `status` answers whether the Concept document is current for consumption. `owa.implementation_status` answers how much capability exists. `owa.verification_status` answers the project evidence disposition. `owa.governance_status` answers whether an authority/decision is resolved. `verified` records actual verification events. None implies another.

## Official Lifecycle

| Value | Meaning | Entry criteria | Exit criteria | Consumer/index/freshness effect | Migration rule |
|---|---|---|---|---|---|
| `draft` | Not yet reviewed or possibly incomplete | New/unreviewed Concept or known incomplete migration narrative | Review promotes to stable; retirement deprecates | Consumable but visibly provisional; indexed with draft badge; freshness still applies | Use when target body is not ready for normal reliance |
| `stable` | Ready for consumption; official default when absent | Content review and authority reconciliation complete | Material uncertainty returns to draft; supersession deprecates | Normal indexing; does not mean verified or implemented | Repository writes it explicitly after migration acceptance |
| `deprecated` | Retained for links/history but no longer current | Replacement verified or authorized retirement recorded | No return to stable; create/supersede with a new Concept | Indexed as deprecated or excluded from default results; no freshness warning needed | Preserve replacement/retirement link in body |

### Allowed Transitions

`draft -> stable`, `draft -> deprecated`, and `stable -> deprecated` are normal. `stable -> draft` is allowed only after a material defect/conflict is recorded. `deprecated -> stable/draft` is prohibited; create a new Concept or formally reverse through a superseding decision and new identity only when the deprecation itself was erroneous.

Lifecycle transition never follows automatically from implementation or verification. A stable Concept can accurately describe a planned capability. A verified Concept can remain draft. A deprecated Concept can retain valid historical verification.

## Project State Fields

| Field | Values | Purpose |
|---|---|---|
| `owa.implementation_status` | `planned`, `partial`, `implemented`, `blocked`, `not-applicable`, `unknown` | Capability or requirement realization |
| `owa.verification_status` | `unverified`, `partial`, `verified`, `conflict`, `unknown` | Evidence-backed disposition of the Concept's claims |
| `owa.governance_status` | `open`, `needs-owner-confirmation`, `resolved`, `blocked`, `not-applicable`, `unknown` | Decision/ownership/policy disposition |

Only fields relevant to the Concept are present. A broad Concept with mixed per-claim state states those differences in the body rather than assigning a misleading aggregate field.

## Current Status Inventory

The current schema permits nine uppercase values. Actual registry data at Phase 3 start uses `VERIFIED`, `PLANNED`, `PARTIAL`, `UNKNOWN`, `NEEDS_OWNER_CONFIRMATION`, and `BLOCKED`; the other three remain allowed legacy states. Locations include the manifest, all eight registries, Markdown status lines, and the bootstrap status model.

| Current value | Current locations/meaning | Future field and value | Migration rule | Loss risk / owner confirmation |
|---|---|---|---|---|
| `VERIFIED` | Manifest, every registry family, Markdown; evidence supports the scoped claim | Usually `owa.verification_status: verified`; add `verified` only from an actual actor/time record; implementation may separately be `implemented` | Inspect claim context and evidence; never map to official `stable` automatically | High if blindly mapped; no owner needed when evidence is complete |
| `PLANNED` | Node and Markdown future capabilities | `owa.implementation_status: planned` | Keep Concept lifecycle stable if it accurately documents the plan; body names authority | Low |
| `PARTIAL` | Domains/evidence/decisions/risks and Markdown mixed capability | `owa.implementation_status: partial` or `owa.verification_status: partial` by context | Determine whether incompleteness concerns capability or evidence; may need both only when independently true | High; no owner if current authority is explicit |
| `UNKNOWN` | Decision/risk records; evidence insufficient | `owa.verification_status: unknown` for factual uncertainty or `owa.governance_status: unknown` for unresolved authority | Choose by record role; do not invent detail | Medium; owner only if later resolution is governance-dependent |
| `NEEDS_OWNER_CONFIRMATION` | Decision records/owner questions | `owa.governance_status: needs-owner-confirmation` | Preserve question, responsible role, and source link in body/decision authority | Low; inherently awaits owner for the business decision, not metadata mapping |
| `DOCUMENTATION_CODE_CONFLICT` | Allowed legacy state; no current record | `owa.verification_status: conflict` | Record both claims, evidence, remediation, and body warning; lifecycle normally `draft` until reconciled | High; resolution owner required, mapping deterministic |
| `DEPRECATED` | Allowed legacy state; no current record | Official `status: deprecated` only if the Concept itself is superseded; otherwise relevant project state/body | Require replacement or authorized retirement evidence | High; owner required when retirement authority is absent |
| `BLOCKED` | Decision records; progress cannot continue | `owa.governance_status: blocked` for decision dependency or `owa.implementation_status: blocked` for capability progress | Select by record role and preserve blocker/unblock condition | Medium; blocker owner remains external, mapping deterministic |
| `NOT_APPLICABLE` | Allowed legacy state; no current record | `owa.implementation_status: not-applicable` or `owa.governance_status: not-applicable` | Require reviewed scope/rationale; do not use official lifecycle | Medium; owner evidence required if scope authority absent |

The mapping covers all nine accepted current values. No current value maps directly to `status: stable` merely because its spelling suggests confidence.

## Project-State Transitions

- Implementation: `unknown -> planned -> partial -> implemented`; `planned/partial -> blocked -> planned/partial`; an authorized scope decision may move to `not-applicable`.
- Verification: `unknown/unverified -> partial -> verified`; any current state may become `conflict` when evidence contradicts text; `conflict -> verified` requires reconciled content and fresh evidence.
- Governance: `unknown/open -> needs-owner-confirmation -> resolved`; `open/needs-owner-confirmation -> blocked -> open/resolved`; authorized review may choose `not-applicable`.

Skipping intermediate states is allowed only when the same reviewed migration supplies all missing evidence. History is preserved in the extension change ledger.

## Validation Behavior

- Missing/unknown official lifecycle on a repository Concept: repository `ERROR`; unknown does not invalidate official conformance by itself.
- Absent official `status` in an external conformant Concept: treat as `stable`.
- Unsupported project state or contradictory combinations: extension `ERROR`.
- `status: deprecated` without a body replacement/retirement statement: repository `ERROR`.
- `implementation_status: implemented` with `verification_status: unknown` is allowed and must not be silently promoted.
- `implementation_status: not-applicable` with a mapped active requirement is an extension `ERROR` unless authority evidence explains the exception.
- `verification_status: verified` without resolvable evidence/verification basis is an extension `ERROR`; it does not require an official `verified` event when historical actor/time is genuinely unknown, but the limitation is explicit.

## Information-Loss Analysis

The legacy status vocabulary overloads record type and claim context. Automatic token-to-token conversion would lose whether `PARTIAL`, `UNKNOWN`, or `BLOCKED` describes implementation, evidence, or governance. Migration therefore uses registry family, record role, evidence links, and body wording as context. Ambiguous rows remain explicitly unknown in the correct dimension; they are never upgraded.
