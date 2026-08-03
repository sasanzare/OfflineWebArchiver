# Phase 7 Failure Triage

- `OKF-OFFICIAL-*`: repair Concept frontmatter or reserved-file structure; do not use extension JSON as a substitute.
- `OKF-POLICY-*`: repair repository metadata according to the frozen contract; do not describe it as an official Google rule.
- `OKF-EXT-*`: repair manifest, registry, evidence, relationship, phase, or path integrity without weakening Concept validation.
- `OKF-QUALITY-*`: review the warning and decide whether to correct it now; warnings are non-blocking.
- `OKF-FORMAT-*` or `format:check`: normalize formatting without changing semantics.
- Internal failure: preserve logs and the JSON artifact, reproduce locally, and add a regression test before changing validator behavior.
