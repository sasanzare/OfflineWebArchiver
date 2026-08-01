# Coverage and Eligibility

## Product Phase 7 status

Recovery statistics, interrupted/paused Job counts, Lease state, Checkpoint progress, and output-verification issues are operational health evidence only. They are not eligible-page coverage and must not change a future denominator. No Phase 7 test or UI claims that pages were rendered, discovered, downloaded, or archived. Valid completed synthetic Jobs remain terminal during recovery; invalid output is reported separately.

## Product Phase 5 policy input

Coverage remains a later measured outcome, but every future candidate classification must retain Scope Engine version, Profile revision, normalized/identity URL hash, structured matched rule ID/type/action/match data, and reason codes. Denied, invalid, duplicate-equivalent, depth-limited, and page-limited candidates must not disappear from the denominator merely because they are ineligible. Phase 5 supplies deterministic classifications only; it does not create a candidate ledger or calculate a target coverage percentage.

Tracking/ignored query policy, canonical aliases, redirects, and profile revisions are denominator-affecting inputs and must be disclosed in future reports. Sensitive values remain redacted. Any identity-engine change requires a new version and an audited before/after denominator comparison.

**Document status:** Proposed baseline  
**Owner / decision authority:** QA Lead; target denominator approved by Target Site Owner  
**Related requirements:** FR-SCOPE-001..003, FR-REPORT-002, FR-VALIDATE-001, NFR-QUAL-001  
**Last updated:** 2026-07-31

This document defines the auditable unit of an **Eligible Page** and the formulas
used to evaluate a Revision. It prevents difficult or failed pages from being
removed after discovery merely to improve reported coverage. Scope authorization
comes from [Project Scope](PROJECT_SCOPE.md); target-specific approval comes from
the [Target-Site Acceptance Plan](../testing/TARGET_SITE_ACCEPTANCE_PLAN.md).

## Measurement snapshot

Before the first target request, the Run must create an immutable, versioned
**measurement snapshot** containing:

- approved domain and path allowlists;
- explicit denied paths and route classes;
- authorization evidence reference;
- URL normalization and query-parameter policy;
- pagination, search, calendar, faceting, session-URL, and infinite-scroll budgets;
- approved accounts/roles and expected login-only areas;
- expected page inventory or sampling method, if available;
- approved request limits and test window; and
- the people approving scope and denominator policy.

The snapshot hash is recorded in every report. A change creates a new Run or
versioned amendment with approver, reason, timestamp, and before/after values.
Post-discovery exclusions never erase records and do not retroactively shrink the
original denominator. The final denominator and every amendment require Target
Site Owner and QA Lead approval.

## Page identity

A **page candidate** is a discovered navigation destination or approved seed that
is expected to yield an HTML document or a client-side routed HTML view. A
**unique page** is a canonical page identity after the following deterministic
normalization, redirect, and deduplication rules.

### URL normalization

Normalization must be versioned and preserve the original URL and discovery
provenance. In order:

1. Parse against the effective base URL; reject invalid or disallowed schemes.
2. Lowercase scheme and host, convert an internationalized host consistently,
   remove the default port, and normalize the empty path to `/`.
3. Remove user-info; credentials in URLs are never accepted.
4. Resolve dot segments and normalize percent-encoding only where semantics do
   not change. Do not decode reserved delimiters.
5. Apply one documented trailing-slash policy per origin; never guess when the
   origin treats slash variants differently.
6. Remove the fragment for HTTP request identity. A fragment becomes a separate
   view only when an approved application profile demonstrates semantic
   hash-routing; its normalized route key is then retained separately.
7. Remove only measurement-snapshot-approved tracking parameters (for example,
   known analytics campaign keys). Preserve unknown query parameters until
   classified.
8. Sort remaining query pairs deterministically without collapsing repeated keys
   or values. Functional parameters remain part of page identity.
9. Apply explicit rules for session identifiers: redact the value, map the URL to
   a stable non-session identity where safe, and report the occurrence. Never
   persist the secret-bearing original.

Both the normalization version and original-to-normalized mapping are evidence.

### Functional route classes

| Route class | Identity and eligibility rule |
|---|---|
| Fragment | Ignored for request identity; separately eligible only for an approved hash-routed view with distinct content and stable normalized route key. |
| Tracking query | Removed only by the pre-run approved list; removal is counted and reported. |
| Functional query | Preserved. Each approved bounded value combination can be a unique page. |
| Pagination | Each discovered, in-budget page is unique and eligible; beyond-budget candidates are `preapproved-limit-excluded`, not silently discarded. |
| Redirect | An alias is not a separate denominator unit. It maps to the final in-scope identity; chain and status remain evidence. |
| Canonical URL | A valid, in-scope canonical may merge identities only after fetch and consistency checks. Cross-scope or contradictory canonicals are warnings, not merge authority. |
| Duplicate content | Byte/semantic duplicates can share stored content, but distinct approved navigation identities remain distinct unless a validated canonical/redirect rule merges them. |
| SPA route | Normalized pathname/query/hash-route state is a page when it is navigable, stable, and materially distinct under the approved profile. |

Redirect loops, external redirect targets, conflicting canonicals, and canonical
cycles cannot be called successful. They receive explicit failure or policy
states.

## Eligibility state machine

Each candidate has an append-only classification history and exactly one current
state:

```text
discovered
  -> eligible
  -> preapproved-excluded
  -> policy-blocked
  -> authorization-blocked
  -> non-page
  -> duplicate-alias
  -> pending-classification
```

- **eligible:** inside the immutable approved scope, safe to retrieve, within a
  preapproved finite route budget, and a unique page or expected HTML view.
- **preapproved-excluded:** matched a rule recorded before the Run, such as an
  explicit denied path or beyond-budget route. It is tracked outside the primary
  denominator.
- **policy-blocked:** would otherwise be in scope but is destructive,
  state-changing, challenge-bypassing, or violates another mandatory safety rule.
  It is reported separately and cannot become success.
- **authorization-blocked:** inside the intended inventory but unavailable
  because required authorization, role, or consent was not supplied or expired.
  It remains visible and, when it was within the approved inventory, remains in
  the eligible denominator as an unsuccessful page.
- **non-page:** verified API endpoint, asset/download, non-HTML response, external
  domain, or invalid scheme. It moves to the appropriate asset/API/external
  metric, not the page denominator.
- **duplicate-alias:** a redirect or validated canonical alias to one counted
  identity. The alias is audited but not counted separately.
- **pending-classification:** insufficient evidence. It is an unresolved
  denominator item and blocks final acceptance rather than disappearing.

Classification changes after discovery require reason, evidence, timestamp, and
QA approval. An item initially marked eligible cannot become
`preapproved-excluded`. It may become a proven `non-page` or `duplicate-alias`,
but the report must show the adjustment.

## Specific content rules

| Content or outcome | Rule |
|---|---|
| Login-only page | Eligible when its role/path was approved and the Run is authorized for it. Login failure or expired session is an unsuccessful/blocked outcome, not exclusion. |
| `401` / `403` | If the page was approved and credentials were expected, count as an eligible failure and `authorization-blocked`; otherwise report as preapproved public-scope exclusion only if that rule existed before the Run. |
| CAPTCHA/WAF/challenge page | Never a successful archive of the intended page. Record `challenge-blocked`; eligible intended pages remain in the denominator. No bypass is attempted. |
| Explicit denied path | `preapproved-excluded` only when present in the signed measurement snapshot. Denied discovery is counted and no request is made. |
| Downloadable file | `non-page`; measure as an Asset Job when approved. An HTML download landing page remains a page. |
| API endpoint | `non-page`; include only in selective API metrics when approved. |
| Non-HTML response | `non-page` after verified response metadata, unless it is an HTML page mislabeled by the server and the approved policy allows content sniffing. |
| External domain | Not page-eligible for this scope. Record as external; follow only if separately approved before dispatch. |
| Destructive/state-changing route | `policy-blocked`, never requested by default, and reported separately. |
| Infinite URL space | Only pre-run seeds/generators and finite budgets are eligible; every cutoff and sample rule is reported. A budget cannot be reduced after failures appear. |
| Calendar route | Eligible only inside a preapproved finite date window and page count. |
| Search results | Eligible only for a preapproved deterministic query corpus and result-page budget; arbitrary user-generated searches are excluded before the Run. |
| Faceted navigation | Eligible only for a preapproved facet/value combination set or finite exploration budget with stable ordering. |
| Session-specific URL | Secret value is never retained; normalize to a stable identity where proven safe. Otherwise mark policy-blocked and report. |
| HTTP error page | The intended eligible identity remains an unsuccessful result. The error document itself is not a successful substitute. |
| Soft-404 | Detect by fixture/profile rules; count the intended identity as unsuccessful and label `soft-404`. |
| Policy/authorization skip | Visible in its separate state and evidence. If discovered inside the approved inventory after Run start, it cannot silently reduce the denominator. |

## Primary formula

Product Phase 6 Queue statistics are operational counts, not coverage evidence. `pending`, `processing`, `retrying`, `completed`, `failed`, `skipped`, and `blocked` counts, discovery rows, Queue depth, or an empty Queue cannot establish `E`, `S`, archive success, or the 95% gate. Coverage begins only when later discovery/render/store/validation phases create the audited candidate and Revision evidence defined below.

Let:

- `E` = final audited set of unique eligible page identities discovered from
  approved seeds and bounded discovery rules, including permanent failures,
  authorization blocks, and challenge outcomes;
- `S` = members of `E` whose intended content was rendered, stored, rewritten,
  and passed minimum offline page validation;
- `X_pre` = candidates excluded solely by pre-run approved scope/budget rules;
- `A` = redirect/canonical aliases mapped to identities in `E`;
- `P` = pending-classification candidates.

```text
archiveCoverage = |S| / |E|
```

Rules:

1. Permanently failed, challenged, expired-session, missing-authorization, and
   soft-404 eligible pages remain in `E`.
2. `X_pre`, `A`, and verified `non-page` items are reported separately and do not
   inflate either numerator or denominator.
3. A canonical content object may satisfy multiple distinct eligible navigation
   identities only when each identity independently passes offline navigation.
4. `P` must be zero for final acceptance. If nonzero, coverage is provisional and
   cannot be used to pass the gate.
5. `|E| = 0` is `not-measurable`, never 100%.
6. The target-site threshold is `archiveCoverage >= 0.95` (95%), using the
   approved snapshot and audited final adjustments. Passing coverage does not
   waive any critical security, leakage, or runtime gate.

Reports show counts and identity lists for `S`, failed eligible pages,
authorization blocks, challenges, `X_pre`, aliases, non-pages, and adjustments.

## Supporting quality metrics

Each ratio is `not-measurable` rather than 100% when its denominator is zero.
Every metric is computed for the immutable Revision and reports numerator,
denominator, excluded records, and calculation version.

| Metric | Formula | Planned target-site gate |
|---|---|---|
| Page archive success | `eligible pages passing render + store checks / E` | Same as archive coverage: at least 95%. |
| Asset completeness | `required referenced asset identities successfully stored and integrity-validated / all required referenced approved asset identities` | At least 98%; every missing asset listed. Final threshold confirmation is OD-006. |
| Internal-link validity | `tested archived internal links resolving to intended local page/asset / all tested archived internal links` | At least 99%; no broken critical navigation path. Final threshold confirmation is OD-006. |
| Offline runtime success | `eligible archived pages passing loopback load + route check with target network blocked / eligible archived pages tested offline` | 100% of `S`; sampling requires preapproval and confidence method. |
| API replay success | `approved captured GET cases replaying expected sanitized status/body contract / approved replay cases executed` | At least 95%, with no live fallback and zero sensitive-data leakage. |
| Console error rate | `unexpected error-level console events / offline page loads observed` | Report distribution and known-baseline exceptions; final maximum is OD-006. |
| Resource failure rate | `failed required resource requests / required resource requests attempted during offline validation` | At most 2%, with zero live target-domain requests. |

An asset shared by several pages is one asset identity for storage completeness,
while each broken reference is separately visible in link/resource diagnostics.
Optional analytics, intentionally disabled live widgets, and explicitly unsupported
features are reported in a separate known-limitations set and cannot be used to
hide required resources.

## Audit evidence

The acceptance evidence bundle must contain:

- measurement snapshot and hash, amendments, approvers, and normalization version;
- discovered candidate ledger with original URL redacted where required,
  normalized identity, provenance, timestamps, and classification history;
- redirect/canonical/duplicate mappings and reasons;
- lists behind every numerator, denominator, exception, and failure category;
- machine-readable raw metrics and matching HTML summary;
- target-network-blocked runtime logs, broken-link results, console/resource
  events, and API replay results;
- random sample or full re-computation output; and
- Target Site Owner and QA Lead sign-off.

Any unapproved denominator mutation, successful challenge page, hidden permanent
failure, nonzero pending classification, or metric mismatch blocks acceptance.
