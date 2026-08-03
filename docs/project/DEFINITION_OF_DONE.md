# Project-Wide Definition of Done

## Product Phase 8 gate

Product Phase 8 satisfies its gate when exact browser provisioning/version/checksum validation, no system fallback/download, sandboxed Process/Context/Page lifecycle, static/JavaScript/SPA/lazy rendering, bounded DOM/network stability, final HTML/optional PNG artifacts, runtime-network authorization, Queue/Lease/Heartbeat/Fencing/Checkpoint/Pause/Resume integration, actual Browser/Page process kill, migration 006, contract 1.5, CLI/Desktop, security, documentation, and OKF evidence pass. AC-P08-001–017 are the concise authority. Link Discovery and all Phase 9/10 capabilities cannot be used to pass this gate and remain absent.

## Product Phase 6 gate

Product Phase 6 is done only when Page Job identity and database uniqueness, schema-4 forward migration, closed state machine, deterministic ordering, transactional enqueue/claim/terminal/retry operations, token fencing, attempt/discovery/history/idempotency persistence, Queue statistics, CLI/Desktop paths, real separate-connection races, architecture/security/docs/OKF validation, and explicit absence of Lease/Heartbeat/Checkpoint/recovery/network capability all pass. Any duplicate logical Job, double claim, partial transition, invalid terminal reopen, ownership/redaction escape, fake concurrency evidence, missing OKF record, or Product Phase 7 recovery behavior fails the gate.

Product Phase 5 remains a completed inherited gate: Site Profile revisions, Scope Engine identity/policy, migration 003, contract 1.2.0, and no-network evidence must continue passing.

**Document status:** Proposed baseline

**Owner / approval authority:** Product Owner and QA Lead; Security Owner for security gates

**Applies to:** every phase, feature, defect fix, release artifact, and Project-format change
**Last updated:** 2026-07-31

“Done” means the change is reviewable, traceable, tested in proportion to its
risk, documented, and supported by retained evidence. A phase passes only when
every applicable item below is satisfied or has an explicit, owner-approved
exception that does not waive a critical safety/security requirement. The
[Phase Plan](PHASE_PLAN.md) applies this definition at every acceptance gate.

## Deliverable and scope

- [ ] Every required phase deliverable exists at its authoritative path and
      matches the approved objective.
- [ ] Requirement IDs and acceptance IDs are stable and trace through
      [Traceability](TRACEABILITY.md) to the planned phase, test category, and risk.
- [ ] Every applicable acceptance criterion has objective expected results and
      retained evidence; statuses use the controlled vocabulary.
- [ ] No unrelated modification is included. Existing user work is preserved.
- [ ] Any scope/requirement change is approved by its decision authority and
      reflected in scope, acceptance, risks, decisions, and handoff.
- [ ] No later-phase behavior is claimed merely because a stub, design, or
      documentation statement exists.

## Implementation and architecture

- [ ] The implementation is connected through the approved production boundary;
      the Desktop Interface and CLI use Archive Core policy rather than duplicate
      or bypass it.
- [ ] Public IPC/HTTP/CLI interfaces, Project manifest, SQLite schema, report
      schema, route map, and other persisted/public contracts are versioned and
      compatibility behavior is documented.
- [ ] Material architecture/security choices have an accepted ADR or remain an
      explicit non-silently-decided item in [Open Decisions](OPEN_DECISIONS.md).
- [ ] Dependencies are justified, pinned/locked under repository policy, license
      and supply-chain implications reviewed, and packaged-runtime ownership clear.
- [ ] Generated files are reproducible where applicable, with source, command,
      tool version, seed, and semantic comparison recorded.
- [ ] No undocumented manual step, developer machine state, global dependency, or
      hidden service is required for the feature.

## Verification and evidence

- [ ] Tests for the phase pass in a clean, declared environment. When tooling
      exists, formatting, lint, type checking, unit, integration, security, and
      relevant end-to-end/package checks pass.
- [ ] Tests include realistic deterministic fixtures, negative paths, boundary
      conditions, cancellation, retry, and failure behavior—not only the happy path.
- [ ] Fault-sensitive persistence/resume behavior is proven with forced browser,
      application, network, and relevant commit-boundary failures.
- [ ] Security controls have adversarial and leakage tests covering logs, reports,
      storage, profiles, screenshots, recordings, crash artifacts, exports, and
      diagnostics as applicable.
- [ ] Manual validation is used only where automation is insufficient and has a
      dated checklist, environment, reviewer, screenshots/recording, result, and
      sanitized artifact references.
- [ ] Expected and actual results match. Flaky or skipped required tests have an
      owner-approved documented reason and cannot conceal a release-blocking gap.
- [ ] The phase provides a reviewable demo, report, or artifact that demonstrates
      its acceptance gate without unsupported claims.

## Data, persistence, and portability

- [ ] Every database migration is forward-versioned and tested from every
      supported prior version, including interruption, rollback/recovery,
      integrity, and data-preservation checks.
- [ ] Every portable Project-format change has round-trip, prior-version,
      unsupported-version, relative-path, reserved-name, Unicode, and supported
      cross-platform compatibility tests as applicable.
- [ ] State transitions are transactional/idempotent as required; duplicate/lost
      job and partial-artifact invariants are tested.
- [ ] Backups, partial files, finalization, and corruption detection fail safely
      without overwriting the only recoverable copy.
- [ ] Disk, memory, route, retry, time, concurrency, and request-rate behavior has
      measurable limits and backpressure appropriate to the phase.

## Security, privacy, and authorization

- [ ] No unresolved critical defect or unresolved high-severity security defect
      exists. A security risk cannot be accepted solely to meet schedule.
- [ ] Authorization, scope, redirect, request-method, rate, challenge, and proxy
      policies are consistent across GUI, CLI, services, workers, and replay.
- [ ] `429` and `Retry-After` compliance is proven across direct and proxy paths;
      no proxy rotation, stealth, fingerprint forgery, CAPTCHA bypass, SMS
      interception, or access-control bypass is introduced.
- [ ] Passwords and OTP values are never persisted. Session, proxy, API, signing,
      and other secrets are protected and absent from prohibited artifacts.
- [ ] Archived content is treated as untrusted; the Local Runtime Server is
      loopback-only by default; external/live and state-changing requests remain
      blocked or explicitly safe under reviewed policy.
- [ ] Data collection/retention/deletion matches the approved purpose and privacy
      policy. Exports and diagnostics are secret-free by default.
- [ ] Fixtures, source, Git diff, reports, and evidence have been scanned for real
      credentials, phone numbers, OTPs, cookies, tokens, proxy passwords, private
      target identifiers, and confidential data.
- [ ] Known security/privacy limitations and residual risks have owners and are
      visible to reviewers and users where relevant.

## UX, documentation, and handoff

- [ ] User-facing UI, dialogs, errors, reports, validation, and bundled
      documentation are clear English and distinguish success, exclusion,
      challenge, blocked, failed, and unknown states.
- [ ] Applicable primary workflows are keyboard navigable with visible focus and
      no color-only meaning; errors provide a safe recovery action.
- [ ] README, authoritative product/project/testing documents, operational notes,
      and user help are updated without duplicating conflicting authority.
- [ ] Known limitations, unsupported live behavior, setup/cleanup, and evidence
      interpretation are documented.
- [ ] `HANDOFF.md` states phase/branch, changes, decisions, risks, validation,
      commands, test status, repository status, and exact next objective.
- [ ] Relative Markdown links and document identifiers pass validation.

## OKF Synchronization

Every Product Phase 2–25 and material intervening change must follow the current
[canonical OKF entry point](../../okf/index.md) and the preserved
[OKF Phase Evolution Contract](../../docs/archive/okf/bootstrap/PHASE_EVOLUTION_CONTRACT.md).
A future phase is not complete until:

- [ ] The current canonical [`okf/index.md`](../../okf/index.md) has been read;
      bootstrap is consulted only for retained history and unresolved decisions.
- [ ] OKF impact has been assessed before editing and changed knowledge domains,
      owners, consumers, requirements, acceptance, risks, and decisions have been
      identified.
- [ ] Affected knowledge nodes and typed relationships are updated after
      implementation and tests reflect actual behavior.
- [ ] New source, test, migration, configuration, contract, build, runtime,
      manual-validation, and release evidence is registered with
      repository-relative paths and sufficient verification metadata.
- [ ] Removed, renamed, replaced, or superseded evidence is handled without
      erasing history or leaving active broken references.
- [ ] Requirement and acceptance mappings are updated.
- [ ] Risks, controls, owners, decisions, and ADR references are updated when
      affected.
- [ ] Unknowns, blockers, limitations and documentation-code conflicts are
      recorded honestly with owners and evidence; no plan is labeled verified
      implementation.
- [ ] The Product Phase knowledge record and OKF change log are updated.
- [ ] OKF schema, identifier, status, link, evidence, relationship and
      critical-orphan validation passes.
- [ ] `npm run okf:validate` passes without repair; the phase change and phase
      record exist, and any migration command is separately repeatable.
- [ ] `HANDOFF.md` and the final phase response list all OKF files changed and
      validation results.

Every future Codex phase prompt must contain a section named **OKF
Synchronization Requirements** that instructs the task to read the current entry
point, identify affected domains, update OKF after implementation/tests, register
repository-relative evidence, update mappings/risks/decisions, record
unknowns/conflicts, update the phase record, validate OKF, and report its changes.

When a bug reveals an incomplete or incorrect documented invariant, failure mode,
boundary, dependency, or behavior, the related OKF records and regression
evidence are updated. New capabilities review all related domains and mappings.
Removed/replaced components retain identifiers/history, deprecation/supersession
relationships, evidence updates, replacement, and migration impact.

## Defects, risks, and approval

- [ ] No unresolved critical defect remains.
- [ ] No unresolved high-severity security or privacy defect remains.
- [ ] Other known defects have severity, reproduction, owner, target phase, user
      impact, and approved disposition; none invalidates an acceptance claim.
- [ ] New or changed risks have probability/impact, warning signals, mitigation,
      contingency, owner, and related requirements/phases.
- [ ] High/critical risks have an active owner and concrete mitigation plan; none
      is called mitigated without tested control evidence.
- [ ] Required Product, QA, Security, Privacy/Legal, Platform, Release, and Target
      Site approvals are recorded for the applicable gate.

## Release/package additions

For any platform or release claim:

- [ ] The packaged artifact—not a development checkout—passes on every approved
      clean OS/architecture image or device.
- [ ] The host lacks system-installed Node.js, Playwright, Chromium, SQLite,
      separate product web server, and product background service unless an
      approved platform dependency explicitly says otherwise.
- [ ] Signature/notarization, SBOM/license/dependency inventory, integrity hashes,
      reproducibility information, install/unpack, update/uninstall, and
      antivirus checks meet release policy.
- [ ] A Project created on every supported platform transfers to and serves on
      every other supported platform in the required matrix.
- [ ] Platform claims name exact supported versions/architectures; evidence from
      one OS never proves another OS.

## What is not Done

The following never qualifies as completion:

- code exists but is untested, tests are not run, or evidence is missing;
- a UI exists but is disconnected from Archive Core or uses mocked production
  behavior;
- only the happy path works, retries are unbounded, or failure/cancel/resume paths
  are unverified;
- documentation-only claims without executable/manual evidence;
- a feature is implemented without reviewing and updating affected OKF;
- a database or Project-format migration changes without updating data/format
  knowledge, versions, consumers, risks, and migration evidence;
- security behavior changes without updating trust/control knowledge, risks,
  decisions, tests, and evidence;
- a public API/IPC/CLI/project/report contract changes without updating its
  version, producers, consumers, compatibility, migration, and OKF contract node;
- a file is removed or renamed while active OKF evidence still cites its old path;
- documentation labels behavior `VERIFIED` without sufficient executable
  repository evidence;
- a phase report hides or omits a known documentation-code conflict;
- passing tests that use unrealistic mocks while bypassing the real protocol,
  storage, browser, process, or packaging boundary;
- security controls without leakage/adversarial tests;
- resume/recovery claims without forced-crash and commit-boundary testing;
- cross-platform claims tested on only one platform or only in development mode;
- a feature hidden behind undocumented manual steps, global tools, developer
  credentials, or external services;
- a challenge page, error page, login redirect, or live fallback counted as an
  archived page;
- a high percentage produced by deleting failures or post-run exclusions from the
  denominator;
- tests marked skipped/flaky/manual with no approved disposition;
- “works correctly,” “secure,” “portable,” or “complete” without measurable
  definition; or
- an exception that weakens authorization, anti-evasion, secret, or untrusted
  content boundaries.

## Phase gate record

Each phase handoff must include:

```text
Phase:
Build/commit under review:
Applicable requirements and acceptance IDs:
Automated commands and results:
Manual evidence:
Defects/risks/exceptions:
Contract/migration/format changes:
OKF domains/evidence/records changed:
OKF validation:
Approvers and date:
Definition of Done result: passed | failed | blocked
```

During Phase 1, “tests pass” means documentation validation only. It does not imply
that future application acceptance criteria have been implemented or passed.
