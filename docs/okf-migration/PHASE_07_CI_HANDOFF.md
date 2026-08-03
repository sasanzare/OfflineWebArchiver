# Phase 7 CI Handoff

CI should install the locked Node dependency set, run `npm run okf:validate`, `npm run okf:validate:json`, `npm run test:okf`, documentation validation, formatting, lint, and typecheck. Error-producing official, policy, and extension layers must fail CI; quality and format warnings should be retained as artifacts without failing the initial rollout.

Phase 7 should publish the JSON report as a build artifact, add deterministic generated-output checks only after their generator exists, and keep official and extension results separately visible in pull-request reporting.
