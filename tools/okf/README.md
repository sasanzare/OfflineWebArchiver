# OfflineWebArchiver OKF Validator

This read-only validator targets Google Open Knowledge Format v0.2 and the separately defined OfflineWebArchiver extensions. It performs no network access, executes no YAML or referenced resource, follows no OKF symlink, and never rewrites knowledge.

## Commands

```text
npm run test:okf
npm run okf:validate
npm run okf:validate:official
npm run okf:validate:extensions
npm run okf:validate:quality
npm run okf:validate:json
```

`okf:validate` runs all layers. Official, repository policy, extension, and formatting errors return exit code 1. Quality warnings remain visible but non-blocking. An invalid command or layer returns exit code 2. JSON mode emits one deterministic JSON document with no human prefix or suffix.

## Layers

| Layer | Responsibility |
|---|---|
| Official | Google OKF v0.2 frontmatter, type, reserved files, and optional official metadata semantics |
| Policy | OfflineWebArchiver taxonomy, required metadata, H1/title, source portability, actors, state separation, and producer-safe YAML |
| Extension | Manifest, registry, schema, identifier, evidence, relationship, and path integrity |
| Quality | Broken links and root-to-Concept reachability |
| Format | Canonical frontmatter order and trailing whitespace |

The official layer intentionally tolerates unknown types and fields. Do not move repository policy into it. Frontmatter is parsed with pinned `yaml` 2.9.0 in YAML 1.2 mode, strict duplicate-key checking, string keys, and bounded alias expansion. Officially valid aliases can be parsed; repository producer policy rejects anchors, aliases, merge keys, explicit tags, and tabs.

## Maintenance

Add a diagnostic in exactly one layer, give it a unique stable code, document it in `PHASE_08_VALIDATOR_COVERAGE_AUDIT.md`, and add a focused reachable fixture before using it in production. Update discovery tests whenever the artifact boundary changes. Update both production schemas and procedural checks when extension structure changes; JSON Schema does not replace path, link, body, or graph checks.

Directory indexes and registries are maintained artifacts, not generated output. There is no regeneration command. Introducing generation requires a deterministic producer, owned-output allowlist, no-write check mode, collision protection, and CI tests as defined in `docs/okf-migration/AUTHORING_AND_GENERATION_POLICY.md`.

CI uses `.github/workflows/okf-validation.yml`, runs the focused tests and blocking layers, and uploads `.artifacts/okf/conformance.json` as `okf-conformance-report`. Hosted execution and branch protection must be verified in GitHub rather than inferred from this local configuration.
