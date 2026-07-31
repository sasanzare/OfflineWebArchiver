# OKF Evidence Policy

**Document status:** Proposed bootstrap contract  
**Owner:** QA Lead with Knowledge Governance Owner  
**Last updated:** 2026-07-31

Every technical claim must identify the repository evidence that supports its
status. Evidence verifies only what it directly demonstrates. A requirement can
prove intent; it cannot prove implementation.

## Authority hierarchy

| Level | Authority | Evidence examples | What it can establish |
|---:|---|---|---|
| 1 | Executable repository evidence | Source, tests, migrations, configuration schemas, package manifests, build scripts, CI, generated contracts, reproduced runtime behavior | Current implementation and reproducible behavior within the verified environment |
| 2 | Accepted technical decisions | Approved ADRs/contracts/schemas, accepted phase reports, verified build/test records | Authorized design and reviewed technical conclusions |
| 3 | Current product documentation | Scope, requirements, acceptance, phase plan, DoD, traceability, risks, decisions, testing strategies | Current approved/planned obligations and governance |
| 4 | Proposal and historical documentation | Proposals, drafts, deprecated designs, historical phase records | Historical intent and change context |
| 5 | Assumptions | Explicit hypotheses with owner and validation plan | Nothing beyond the fact that an assumption is recorded |

Current executable evidence supersedes outdated descriptive claims about behavior,
but it does not automatically authorize noncompliant behavior. Contradiction
creates `DOCUMENTATION_CODE_CONFLICT`.

## Evidence types

Canonical OKF must support at least:

| Evidence type | Definition | Typical verification |
|---|---|---|
| `source` | Current production or support source file/symbol | Review plus mapped tests |
| `test` | Existing executable automated test and result | Recorded command, exit result, environment |
| `migration` | Versioned data/format migration | Upgrade, interruption, rollback/integrity evidence |
| `configuration` | Versioned configuration/default/schema | Schema validation and consumer behavior |
| `contract` | Public IPC, HTTP, CLI, project, report, event, or schema contract | Contract/schema tests and consumer mapping |
| `build` | Reproducible build definition and result | Documented command, clean environment, hashes |
| `runtime-observation` | Reproduced behavior of an identified build | Procedure, environment, logs/traces, expected result |
| `phase-report` | Accepted phase completion/evidence summary | Gate review and artifact references |
| `adr` | Accepted architecture decision record | Approval, alternatives, consequences, implementation mapping |
| `requirement` | Current functional/non-functional obligation | Defined ID in the authoritative scope |
| `acceptance` | Measurable acceptance definition/status | Matrix row and retained result evidence |
| `risk` | Current risk statement and treatment | Owner review and linked controls/evidence |
| `decision` | Open or resolved owner/technical question | Owner outcome and ADR where required |
| `manual-validation` | Human verification where automation is insufficient | Dated checklist, reviewer, environment, sanitized artifacts |
| `release-artifact` | Identified distributable and release metadata | Hash/signature/SBOM/package matrix and clean-host results |

## Required evidence record

Each future record contains:

| Field | Rule |
|---|---|
| Evidence ID | Unique `OKF-EVD-###`; never reused |
| Evidence type | One controlled value above |
| Repository-relative path | Root-relative, normalized with `/`; must resolve at validation time |
| Optional reference | Line, heading, table row, symbol, test identifier, schema pointer, or artifact member |
| Commit hash | Full or unambiguous repository commit when available; `NOT_COMMITTED` only for a working-tree phase record |
| Product phase | `P02` through `P25`, or `P01` for migrated Phase 1 documentation evidence |
| Verification date | ISO `YYYY-MM-DD` |
| Verification method | Exact review, command, procedure, or reproducible observation |
| Verification status | One OKF knowledge status with rationale |
| Related knowledge nodes | One or more existing/reserved node IDs |
| Notes | Scope, environment, limitations, sanitization, or reason |
| Superseded evidence | Prior evidence ID when replaced; history remains resolvable |

The record must distinguish a file’s existence from behavior it allegedly proves.
For example, a build script can be verified as present without proving that a
package was built successfully.

## Path and reference rules

- Stored evidence paths are repository-root relative and use `/`.
- Markdown hyperlinks remain relative to the document containing the link.
- Registry paths are normalized from the repository root; they are never copied
  as if relative to the OKF registry location.
- Drive-qualified, home-relative, temporary-machine, editor, and workspace-local
  paths are prohibited.
- A line reference is optional because lines move. Prefer a stable symbol, test
  ID, table-row ID, heading anchor, or schema pointer; update stale line numbers.
- Renamed/moved evidence creates a change record and updates every active
  reference in the same change.
- Removed evidence is marked superseded/deprecated and linked to replacement or
  removal rationale. Broken active evidence paths fail validation.

## Claim and verification rules

- Do not cite an undocumented external assertion as implementation evidence.
- Do not cite a proposal, requirement, phase plan, or architecture sketch as
  proof that a feature exists.
- Do not cite a test identifier unless the test exists. Do not claim it passed
  unless the recorded command was executed successfully in the stated environment.
- Do not claim a generated artifact is reproducible unless inputs, tool versions,
  command, environment, and semantic/hash comparison are documented.
- Manual evidence must state why automation was insufficient.
- Runtime observation names the exact build and cannot be generalized to untested
  platforms/configurations.
- Release claims cite the actual distributable, not a development checkout.
- A claim supported only by Levels 3–5 cannot have implementation status
  `VERIFIED`.
- Evidence confidence does not override requirement or authorization boundaries.

## Sensitive evidence

- Never store passwords, OTP values, cookies, session values, access/API tokens,
  proxy credentials, signing keys, private phone numbers, or private target URLs
  in OKF records.
- Evidence records may use sanitized identifiers, hashes where policy permits,
  protected external references, and redacted summaries.
- Hashes do not automatically anonymize low-entropy secrets.
- Screenshots, recordings, traces, crash artifacts, HTTP material, and diagnostic
  bundles follow the approved privacy/retention policy and remain outside ordinary
  committed OKF when sensitive.
- Redaction must retain enough non-sensitive structure to audit the claim.

## Lifecycle and validation

1. Register evidence in the phase that creates or first verifies it.
2. Link it to nodes, relationships, requirements, acceptance, risks, decisions,
   and the phase record.
3. Revalidate it when the artifact, consumer, contract, environment, or claim
   changes.
4. On rename/removal, update or supersede the record in the same phase.
5. Preserve history; do not rewrite old evidence to resemble current behavior.
6. Fail canonical validation on duplicate IDs, invalid types/statuses, missing
   paths, orphan active evidence, prohibited absolute paths, or missing
   supersession targets.

During bootstrap, Product Phase 2 records a human-readable evidence summary under
`okf-bootstrap/PHASE_EVIDENCE/`. Machine-readable evidence schema remains
`UNKNOWN` pending `OKF-OD-006`.
