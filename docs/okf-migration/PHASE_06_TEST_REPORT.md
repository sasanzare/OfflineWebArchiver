# Phase 6 Test Report

`npm run test:okf` passes four tests: retained legacy validator regression, migration regression, CLI human/JSON/layer filtering, and malformed-frontmatter safe handling. Fixtures are intentionally inline or isolated under `tests/fixtures/okf/` so malformed content never enters production discovery.

The full repository test suite retains its previously observed browser navigation-timeout instability; that application-test issue is outside the Phase 6 validator scope.
