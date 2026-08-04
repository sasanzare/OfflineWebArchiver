# Release Readiness

## Decision

CONFORMANT_WITH_EXTERNAL_VERIFICATION_PENDING

Local Windows validation is green for the official OKF bundle, OWA references, provenance, extension, quality, format, focused tests, full tests, documentation, lint, typecheck, and build. This is a repository self-assessment, not Google certification.

## Evidence to include in the release commit

Commit these seven files together:

- [FINAL_OKF_CONFORMANCE_AUDIT.md](FINAL_OKF_CONFORMANCE_AUDIT.md)
- [FINAL_FILE_INVENTORY.csv](FINAL_FILE_INVENTORY.csv)
- [FINAL_CONCEPT_AUDIT.csv](FINAL_CONCEPT_AUDIT.csv)
- [FINAL_RULE_INVENTORY.csv](FINAL_RULE_INVENTORY.csv)
- [FINAL_VALIDATION_EVIDENCE.json](FINAL_VALIDATION_EVIDENCE.json)
- [RELEASE_READINESS.md](RELEASE_READINESS.md)
- [FINAL_AUDIT_HASHES.sha256](FINAL_AUDIT_HASHES.sha256)

Phase 6 made no source or live knowledge changes. Do not stage, commit, push, reset, rebase, or stash as part of this audit.

## Recommended commit and PR strategy

Recommended commit message:

docs(okf): add final OKF conformance audit and release readiness evidence

Open a normal pull request after the evidence files are intentionally staged. Keep the evidence commit separate from unrelated product work so the audit scope remains reviewable.

## Pre-commit commands

Run these immediately before the future evidence commit:

1. npm ci
2. npm run okf:validate:conformance
3. npm run okf:validate:references
4. npm run okf:validate:provenance
5. npm run okf:validate:extension
6. npm run okf:validate:quality
7. npm run okf:validate:format
8. npm run okf:validate
9. npm run test:okf
10. npm run docs:validate
11. npm run format:check
12. npm run lint
13. npm run typecheck
14. npm run test
15. npm run build
16. git diff --check

Inspect FINAL_VALIDATION_EVIDENCE.json and ensure no unexpected file is staged.

## Post-push verification

Inspect the OKF Validation workflow for both ubuntu-latest and windows-latest. Confirm that each named layer, combined validation, focused tests, docs validation, format, lint, and typecheck completed. Download and inspect the JSON report and workflow summary artifact. Verify the required branch-protection context in repository settings.

Hosted CI and branch-protection status were not accessible during this local audit. No hosted success or protection claim is made.

## Failure triage

If a hosted layer fails:

1. Identify the exact layer, rule ID, path, and JSON diagnostic.
2. Reproduce the named command locally with default network disabled.
3. Decide whether the owner is official structure, references, provenance, extension, quality, format, tests, or documentation.
4. Make the smallest scoped correction in the owning file.
5. Rerun the full validation sequence and update the final evidence files.
6. Do not weaken the official/OWA boundary or convert an external-verification limitation into a pass.

If only the optional remote job fails, classify the result by HTTP status, timeout, rate-limit, or authentication state; do not turn a remote-only failure into a local OKF conformance failure.

## External verification checklist

- Hosted CI for the evidence commit: pending.
- Both operating-system matrix legs: pending hosted confirmation.
- Uploaded JSON and summary artifacts: pending hosted confirmation.
- Branch protection and required context: pending repository-settings confirmation.
- Optional remote source availability: intentionally not required by default.
