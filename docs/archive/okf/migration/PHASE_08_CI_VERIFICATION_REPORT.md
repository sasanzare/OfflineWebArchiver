# Phase 8 CI Verification Report

Audit date: 2026-08-03

## Status separation

| Status | Result | Evidence |
|---|---|---|
| Workflow configuration verified | VERIFIED | `.github/workflows/okf-validation.yml` static audit |
| Local command parity verified | VERIFIED | Locked install and required local command matrix |
| Hosted GitHub Actions run verified | NOT_VERIFIED | No hosted-run evidence was available locally; GitHub CLI was unavailable |
| Branch protection verified | NOT_VERIFIED_FROM_LOCAL_REPOSITORY | Repository settings are not represented by files |

## Workflow audit

The sole workflow is `OKF Validation`; its required job/check is `OKF validation and quality gates`, producing the stable check name `OKF Validation / OKF validation and quality gates`.

| Control | Result |
|---|---|
| Pull-request trigger | Present |
| Push trigger | Present |
| Manual/scheduled trigger | Not implemented and not claimed |
| Node version | Pinned to 24.17.0 |
| Locked installation | `npm ci` |
| Dependency cache | npm cache through `actions/setup-node` |
| Validator tests | Blocking `npm run test:okf` |
| Production validation | Blocking `npm run okf:validate` |
| Docs/format/lint/typecheck | Blocking |
| Quality warnings | Reported but non-blocking by validator severity |
| Permissions | `contents: read` only |
| Concurrency | Per workflow/ref with cancellation |
| Timeout | 15 minutes |
| `pull_request_target` | Absent |

## Conformance artifact

Artifact name: `okf-conformance-report`. Path: `.artifacts/okf/conformance.json`. Retention: 14 days. Generation and upload use `if: always()`.

The JSON schema version is `1.0.0`; it records validator name/version, OKF version, result, intended exit code, artifact classifications, layer-separated diagnostics, error count, and warning count. Paths are repository-relative and contain no sensitive local directory. Local generation uses the same validator command as CI.

## Administrative action

Configure branch protection manually and require `OKF Validation / OKF validation and quality gates`. Hosted execution and protection must be confirmed in GitHub before either is reported as verified; their unverified administrative status does not change the locally proven code-level conformance result.
