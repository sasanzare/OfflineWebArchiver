# ADR-041: Pinned Playwright and Chromium Runtime

## Status
Accepted — 2026-08-01.

## Context
Production rendering needs a reproducible browser without system or first-launch download dependencies.

## Decision
Pin `playwright-core` 1.56.1 with Chromium 141.0.7390.37 revision 1194 from the official Playwright artifact source. Resolve a root-contained relative executable from a versioned manifest and verify SHA-256 before launch. Upgrade both together after browser, crash, security, and packaging evidence; retain the prior verified pin for rollback.

## Alternatives
System Chrome, global Playwright cache, runtime download, and independently moving browser versions were rejected.

## Consequences
Provisioning is an explicit build/development step and packaged releases must copy the resource and Node dependency.

## Security Impact
No fallback, path escape, version mismatch, or altered executable is accepted; sandbox remains enabled.

## Reliability Impact
Missing/invalid resources fail with structured errors before a Job navigates.

## Concurrency Impact
None beyond the selected single-runtime policy.

## Persistence Impact
The browser resource manifest is outside portable Project data.

## Migration Impact
No database migration is caused by provisioning.

## Testing Impact
`browser:verify` and real Chromium suites verify pin, checksum, path, launch, and no fallback/download.

## Portability Impact
Windows x64 is verified; Linux/macOS resource manifests remain future packaging work.

## Related Requirements
FR-RENDER-001, NFR-PORT-001, NFR-SEC-003.

## Related Acceptance Criteria
AC-P08-001, AC-P08-002.

## Related Risks
R-002, R-090, R-091.

## Related Open Decisions
OD-066, OD-067.

## Related OKF Domains
OKF-DOM-012, OKF-DOM-029.
