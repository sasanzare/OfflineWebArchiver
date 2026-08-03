# Phase 7 Conformance Artifact Specification

Artifact name: `okf-conformance-report`. It contains `.artifacts/okf/conformance.json`, the unmodified JSON output of `node tools/okf/cli.mjs validate --format json`.

The report preserves artifact classification, layer identity, diagnostic codes, severities, paths, and error count. It is generated with `if: always()`, uploaded with `if: always()`, retained for 14 days, and remains available after designed validation failures when report generation succeeds. Consumers must not treat volatile CI metadata as validator output.
