# Actor and Provenance Model

## Actor Grammar

Official OKF v0.2 defines three actor forms. OfflineWebArchiver narrows characters and casing for deterministic production:

```text
human:<id>
process:<id>
<producer>/<version>
```

Repository grammar:

```regex
human:[a-z0-9][a-z0-9._-]{0,63}
process:[a-z0-9][a-z0-9._-]{0,63}
[a-z0-9][a-z0-9._-]{0,63}/[a-z0-9][a-z0-9.+_-]{0,63}
```

Actors are case-sensitive and canonical lowercase. IDs remain stable when display names, email addresses, models, or workflow runs change.

## Actor Kinds

| Kind | Use | Valid examples | Invalid examples |
|---|---|---|---|
| Human | A person authored/confirmed content | `human:docs-owner`, `human:reviewer-01` | `human:Jane Doe`, email address, real name without consent |
| Process | An automated recurring process verifies or changes content | `process:docs-validation`, `process:nightly-okf-check` | `CI Job #42`, `process:` |
| Producer/version | A tool or agent generated current content | `offlinewebarchiver-okf/1.0.0`, `openai-codex/gpt-5.6` | `Codex`, `tool/latest`, `agent/no version spaces` |

The producer component identifies the stable product/tool family; version identifies the model, release, or contract that materially affects output. Per-run IDs and timestamps belong in logs/reports, not the actor string.

## Human and AI-Assisted Content

| Situation | `generated` | `verified` | Ownership interpretation |
|---|---|---|---|
| Human wrote and owns the Concept | Absent | Optional actual review | Git identifies author/editor |
| Codex suggested or formatted content; human substantively reviewed and owns every claim | Absent | Add human event only if the person actually verified sources | Human-authored with assistance; formatting assistance is not generation provenance |
| AI/tool produced the current body with no substantive human ownership review | Required with producer/version actor | Optional process/human verification | Fully generated Concept |
| Migration script mechanically transforms and meaningfully rewrites content | Required with migration producer/version | Add later verification independently | Migration-generated until ownership review |
| Human verifies generated content | Preserve `generated`; append `verified` human actor | Required event records real check | Human verification does not erase origin |

Never use `human:` because a tool ran under a person's account. Never add a human verification event merely because a human approved a Git diff without checking sources/claims.

## `generated` Semantics

`generated.by` identifies how the current content was produced. `generated.at` is the UTC instant of the last meaningful content change. Repository producers require both. Regeneration updates `at` only if semantic content changes; deterministic no-op generation leaves it unchanged. Generated Concepts are edited through authoritative inputs and regeneration, not manual body edits.

Mixed authored/generated sections are not approved in the initial contract. A formatting/lint tool does not cause `generated`. If a human substantially rewrites a generated Concept and accepts semantic ownership, a reviewed migration amendment may remove `generated`; history retains origin.

## `verified` Semantics

Every event has `by` and `at`. Repository output always uses a list ordered oldest to newest; consumers accept the official single-mapping shorthand. Multiple entries are independent checks, not an approval sequence. Verification method/evidence lives in `sources`, `owa.evidence_ids`, the body, or evidence registry.

## Unknown Historical Actors

Do not invent `human:unknown`. If the historical actor or timestamp is unknown, omit the verification event and use `owa.verification_status` plus source/body explanation. A producer actor may be recorded only when both producer and version are established. Missing optional trust metadata is honest and officially consumable.

## Privacy and Identity Stability

- Prefer role-based or repository pseudonymous human IDs; do not publish email, OS username, machine name, or legal name without need and consent.
- Maintain any human-ID directory outside public Concept metadata if identity resolution is required.
- Renaming an actor requires a compatibility mapping in extension documentation; old events are not silently rewritten.
- Process actors name stable workflow purpose, not vendor job/run numbers.
- Actor strings are attribution/trust signals, not authorization identities or access-control principals.

## Validation

Malformed actors are repository `ERROR`. An unfamiliar but syntactically valid actor passes official consumption; extension validation may warn when an expected registered producer/process is unknown. A `human:` actor yields official human-reviewed trust only when it appears in `verified`; a human `generated.by` does not itself prove verification.
