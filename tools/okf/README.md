# OfflineWebArchiver OKF Validator

This read-only validator targets Google Open Knowledge Format v0.2 and the separately defined OfflineWebArchiver extension layer. Default validation is deterministic: it performs no network access, executes no YAML or referenced resource, follows no OKF symlink or junction, and never rewrites knowledge.

## Commands

```text
npm run test:okf
npm run okf:validate
npm run okf:validate:official
npm run okf:validate:references
npm run okf:validate:extension
npm run okf:validate:quality
npm run okf:validate:format
npm run okf:validate:remote
npm run okf:validate:json
```

`okf:validate` runs all layers. An invalid command or layer returns exit code 2; validation errors return exit code 1. Warnings remain visible and non-blocking unless `--strict-warnings` is supplied. `--remote` enables bounded remote checks for HTTP(S) resources; it is never required by default or CI. JSON mode emits one deterministic JSON document with no human prefix or suffix.

## Layers

| Layer | Responsibility |
|---|---|
| Official OKF Structure | Every Markdown file under `okf/`, required Concept frontmatter/type, reserved indexes/logs, and filesystem boundary |
| Official OKF References | Source URI/path syntax, local target resolution, immutable GitHub permalinks, and Markdown link diagnostics |
| OWA Extension | `okf-extension/` manifest, registry, schema, identifier, evidence, relationship, and path integrity |
| OWA Quality | OfflineWebArchiver taxonomy, recommended metadata, producer-safe YAML, and Concept reachability |
| Formatting | Canonical frontmatter order and trailing whitespace |

The official layer intentionally tolerates unknown types, unknown fields, missing optional metadata, missing directory indexes, and broken cross-links as required by OKF v0.2. Do not move repository policy into it. Frontmatter is parsed with pinned `yaml` 2.9.0 in YAML 1.2 mode, strict duplicate-key checking, string keys, and bounded alias expansion. Officially valid aliases can be parsed; OWA quality policy may recommend avoiding them.

## Maintenance

Add a diagnostic in exactly one layer, give it a unique stable code, document it in `PHASE_08_VALIDATOR_COVERAGE_AUDIT.md`, and add a focused reachable fixture before using it in production. Update discovery tests whenever the artifact boundary changes. Update both production schemas and procedural checks when extension structure changes; JSON Schema does not replace path, link, body, or graph checks.

Directory indexes and registries are maintained artifacts, not generated output. There is no regeneration command. Introducing generation requires a deterministic producer, owned-output allowlist, no-write check mode, collision protection, and CI tests as defined in `docs/okf-migration/AUTHORING_AND_GENERATION_POLICY.md`.

CI uses `.github/workflows/okf-validation.yml`, runs the focused tests and blocking layers, and uploads `.artifacts/okf/conformance.json` as `okf-conformance-report`. Hosted execution and branch protection must be verified in GitHub rather than inferred from this local configuration.
