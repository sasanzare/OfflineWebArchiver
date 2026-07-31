# OKF Knowledge Status Model

**Document status:** Proposed bootstrap contract  
**Owner:** Knowledge Governance Owner; role confirmation tracked in `OKF-OD-019`  
**Last updated:** 2026-07-31

A status describes the evidence state of one knowledge claim or node, not the
overall quality of its document. Status must be evaluated per claim where a file
mixes current facts, plans, and unknowns.

## Mandatory statuses

| Status | Meaning | Minimum basis | Current example |
|---|---|---|---|
| `VERIFIED` | Directly supported by current repository evidence and, where behavior is claimed, tests or reproducible observation | Evidence record at the appropriate authority level and a completed verification method | Product Phase 1 documents exist; the repository contains Markdown only |
| `PLANNED` | Approved for a future phase but not implemented | Current requirement, acceptance criterion, or approved plan | Playwright rendering is planned for Product Phase 7 |
| `PARTIAL` | Some evidenced behavior exists, but the complete claim or acceptance criterion is unsatisfied | Evidence for the implemented subset plus explicit missing conditions | Available only after implementation begins |
| `UNKNOWN` | Repository evidence is insufficient to determine the answer | Recorded search/inspection scope and missing evidence | Exact future manifest schema |
| `NEEDS_OWNER_CONFIRMATION` | Business, legal, target, platform, budget, ownership, or policy authority must decide | Named owner, question, deadline, and evidence need | Exact supported platform matrices |
| `DOCUMENTATION_CODE_CONFLICT` | Current implementation evidence contradicts current documentation | Both evidence records, affected mappings, owner, and resolution work item | No current example because source code does not exist |
| `DEPRECATED` | Retained for history but no longer guides current work | Replacement/supersession relation and effective phase/date | A bootstrap node after validated canonical migration, if superseded |
| `BLOCKED` | Progress cannot continue until a named dependency or decision resolves | Blocking reference, owner, and unblock condition | Canonical manifest schema before Phase 3 prerequisites |
| `NOT_APPLICABLE` | Reviewed and formally determined not to apply | Reviewer/authority, reason, scope, and date | Mobile application knowledge domain under the approved product scope |

`VERIFIED` never means “written confidently.” A Level 3 plan can verify that a
capability is planned, but it cannot verify that the capability works.

## Allowed transitions

| Transition | Required condition |
|---|---|
| `PLANNED → PARTIAL → VERIFIED` | Implementation evidence first proves a subset, then all mapped acceptance and verification requirements. |
| `UNKNOWN → NEEDS_OWNER_CONFIRMATION → PLANNED` | Inspection identifies an authority-dependent question; the owner then approves a plan. |
| `UNKNOWN → PLANNED` | New accepted technical/product evidence directly defines the plan without an owner-only question. |
| `PLANNED → BLOCKED` | A dependency, decision, defect, or external condition prevents planned progress. |
| `BLOCKED → PLANNED` | The blocker is resolved, but implementation evidence still does not exist. |
| `PARTIAL → BLOCKED` | Existing subset remains evidenced while completion cannot progress. |
| `VERIFIED → DOCUMENTATION_CODE_CONFLICT` | New or changed executable evidence contradicts the current knowledge claim. |
| `PLANNED → DOCUMENTATION_CODE_CONFLICT` | Executable work diverges from an approved plan before the record is reconciled. |
| `DOCUMENTATION_CODE_CONFLICT → VERIFIED` | Evidence verifies the resolution and affected records/tests/docs are synchronized. |
| `VERIFIED → DEPRECATED` | A replacement is verified or an authorized decision retires the concept with preserved history. |
| `PLANNED → DEPRECATED` | An approved plan is superseded before implementation; replacement and reason are recorded. |
| `UNKNOWN → NOT_APPLICABLE` | An authorized review proves the concept does not apply. |
| `BLOCKED → NOT_APPLICABLE` | The responsible authority formally removes the requirement or scope with traceable approval. |

Transitions may preserve a prior state in history; the current registry stores the
latest state and the change registry stores the transition evidence.

## Suspicious transitions

These are invalid without new evidence and explicit review:

- `UNKNOWN → VERIFIED`
- `PLANNED → VERIFIED`
- `BLOCKED → VERIFIED`
- `NEEDS_OWNER_CONFIRMATION → VERIFIED`
- `DOCUMENTATION_CODE_CONFLICT → DEPRECATED`

They may occur only when the same change also registers the missing executable or
accepted evidence, verification method/result, owner/reviewer, affected
relationships, and intermediate rationale. A phase completion statement alone is
not evidence.

Other invalid patterns:

- changing `PARTIAL` to `VERIFIED` while mapped critical acceptance remains
  `defined`, `blocked`, `needs-decision`, or failed;
- using `NOT_APPLICABLE` to avoid a difficult requirement;
- using `DEPRECATED` without a replacement or explicit retired-without-replacement
  relation;
- changing a conflict directly to `PLANNED` while current contradictory code
  remains; or
- deleting a status history entry.

## Conflict resolution

For `DOCUMENTATION_CODE_CONFLICT`:

1. Record both conflicting claims without rewriting either history.
2. Register repository-relative evidence for both and their authority levels.
3. Identify affected requirements and acceptance criteria.
4. Identify affected domains, consumers, risks, releases, and phase records.
5. Assign an owner.
6. Create or reference an open decision, defect, or corrective task.
7. Define the expected resolution and verification method.
8. Update code, tests, documentation, and relationships as authorized.
9. Re-run verification.
10. Change status only after evidence proves the resolution; preserve the
    conflict record and supersession links.

Executable evidence normally has precedence for describing current behavior, but
security or product documentation can still define that current behavior is
noncompliant. “Code wins” does not mean an unauthorized implementation becomes
the accepted contract.

## Review rules

- Status is reviewed on every evidence change, phase gate, conflict, defect that
  reveals an incomplete boundary, and artifact removal/rename.
- The record stores status, effective product phase, verification date, owner,
  rationale, and evidence IDs.
- `UNKNOWN`, `BLOCKED`, and `NEEDS_OWNER_CONFIRMATION` are honest outcomes and
  must not be replaced by invented detail.
- After canonical activation, validation rejects labels outside this set and
  transitions without required evidence/history.
