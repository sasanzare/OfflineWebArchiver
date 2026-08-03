# Phase 7 CI Architecture

The repository uses one dedicated workflow: `.github/workflows/okf-validation.yml`, named `OKF Validation`. It runs on every pull request and push because no safe complete path-filter dependency model exists.

The `OKF validation and quality gates` job runs on Ubuntu with Node 24.17.0, `npm ci`, npm cache keyed by the lockfile, validator tests, blocking OKF validation, documentation and format gates, lint, and typecheck. It writes a JSON conformance report before artifact upload, including after a failed preceding step. Concurrency cancels superseded runs for the same workflow and ref; the job timeout is 15 minutes.

Local parity uses the same npm commands and direct JSON CLI invocation. Hosted GitHub Actions execution has not been performed in this phase.
