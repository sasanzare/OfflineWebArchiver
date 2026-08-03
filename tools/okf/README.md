# OfflineWebArchiver OKF validator

This read-only validator targets Google Open Knowledge Format v0.2 and the separately defined OfflineWebArchiver policy layers. The authoritative specification revision is 3fcbb9f828c2f23d109c855ee403c3a4c81f3a96. Default validation is deterministic: it performs no network access, executes no YAML or referenced resource, follows no OKF symlink or junction, and never rewrites knowledge.

## Commands

    npm run okf:validate
    npm run okf:validate:conformance
    npm run okf:validate:references
    npm run okf:validate:provenance
    npm run okf:validate:extension
    npm run okf:validate:quality
    npm run okf:validate:format
    npm run okf:validate:remote
    npm run okf:validate:json
    npm run test:okf

The conformance command has the compatibility alias npm run okf:validate:official. The extension alias npm run okf:validate:extensions is also retained. The direct JSON command is node tools/okf/cli.mjs validate --format json so its stdout is one JSON document without an npm wrapper.

`npm run okf:migrate` is retained only as a deprecated compatibility command.
The migration is closed; it performs no file discovery or repair and exits with
code 2. Use the active maintainer guide for current changes.

Exit codes are deterministic:

* 0 means the requested layers completed without errors. Warnings are allowed.
* 1 means a requested layer emitted an error, or warnings-as-errors was enabled and a warning was emitted.
* 2 means invalid CLI usage or configuration.
* 3 means an unexpected internal validator failure.

Use --warnings-as-errors to make warnings blocking. The historical --strict-warnings option remains an undocumented compatibility spelling. Use --remote only for the optional bounded remote checks; standard validation and CI use network mode disabled.

## Layers

| Layer | Responsibility | Official conformance? |
|---|---|---|
| Official OKF v0.2 Conformance | UTF-8 Markdown discovery, Concept frontmatter/type, present reserved index/log structure, and the optional root version declaration | Yes |
| OWA Reference Integrity | Local Markdown links, local bundle paths, traversal and unsafe-link checks, source shape, URL syntax, and reference statuses | No |
| OWA Provenance Policy | Full-SHA GitHub blob provenance for current concrete sources, local commit/path verification when available, and local-path rejection | No |
| OWA Extension Validation | Only okf-extension/ JSON, schemas, registries, maps, reports, and extension Markdown | No |
| OWA Quality Validation | Repository taxonomy, recommended metadata, reachability, source conventions, and project quality | No |
| OWA Format Validation | Repository frontmatter ordering and formatting conventions | No |

Official conformance follows OKF v0.2 §§3, 3.1, 4.1, 8, 9, 11, and 12. A root index, directory index, and log are all optional. When present, reserved files are validated. Unknown Concept types, unknown fields, missing optional metadata, broken cross-links, mutable GitHub URLs, and unverified remote targets do not create official conformance errors.

OWA Reference Integrity reports a broken normal Markdown link as OWA-REF-LINK-BROKEN with warning severity by default. Local reference absence, traversal, malformed URL/path syntax, and unsafe local targets are OWA reference diagnostics. A scope descriptor such as all queries in BigQuery project X is recorded as a scope descriptor and is never resolved as a guessed filesystem path.

OWA Provenance reports mutable GitHub refs as OWA-PROVENANCE-MUTABLE-GITHUB-URL. Full-SHA external GitHub URLs may remain remote-target-not-checked in the default network-free mode. Same-repository missing commits and paths are OWA-PROVENANCE-COMMIT-NOT-FOUND and OWA-PROVENANCE-PATH-NOT-IN-COMMIT. Runtime inability to spawn Git is reported in structured status data and does not turn an otherwise valid source into an official conformance failure.

## Diagnostics

Every diagnostic contains a canonical layer, stable rule ID, severity, path, message, and optional line, column, remediation, and structured data. Prefixes are:

* OKF-CONFORMANCE-
* OWA-REF-
* OWA-PROVENANCE-
* OWA-EXT-
* OWA-QUALITY-
* OWA-FORMAT-
* INTERNAL-

The combined command preserves each layer result and reports Overall Repository OKF Policy. It never relabels an OWA-only failure as an Official OKF failure.

## JSON report

The combined JSON report contains schema_version, specification_version, specification_revision, requested_layers, layer_results, diagnostics, counts, exit_code, network_mode, generated_at, reference_checks, and provenance_checks. Paths and check metadata are repository-relative and do not include absolute runner paths. generated_at is omitted from snapshot comparisons.

## Maintenance

Add a diagnostic in exactly one layer, give it a unique stable code, document it in the active validation contract, and add a focused isolated regression fixture. Update discovery tests whenever the official artifact boundary changes. Extension schemas do not replace procedural path, link, body, or graph checks.

Directory indexes and registries are maintained artifacts, not generated output. There is no regeneration command. Introducing generation requires an owned-output allowlist, no-write check mode, collision protection, and CI tests.
