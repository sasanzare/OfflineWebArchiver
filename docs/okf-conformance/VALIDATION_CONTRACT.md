# OKF validation contract

This is the active maintainer-facing contract for OfflineWebArchiver OKF validation. The normative baseline is Google Open Knowledge Format v0.2, revision 3fcbb9f828c2f23d109c855ee403c3a4c81f3a96.

## Layer ownership

| Layer | CLI command | Owns | Must not own |
|---|---|---|---|
| Official OKF v0.2 Conformance | npm run okf:validate:conformance | Present Markdown UTF-8/readability, Concept frontmatter, non-empty string type, present index/log structure, and root okf_version | Link existence, remote availability, immutable provenance, project taxonomy, extension JSON, formatting |
| OWA Reference Integrity | npm run okf:validate:references | Local Markdown links, local path targets, traversal, unsafe links, source/resource shape, URL syntax, and reference status | Official conformance classification, mutable-source policy, remote checks by default |
| OWA Provenance Policy | npm run okf:validate:provenance | Full-SHA GitHub provenance for current concrete sources, local commit/path verification, and developer-local path rejection | Official OKF semantics and remote availability by default |
| OWA Extension Validation | npm run okf:validate:extension | Only okf-extension/ schemas, JSON, registries, maps, reports, and extension Markdown | Official okf/ discovery |
| OWA Quality Validation | npm run okf:validate:quality | Repository taxonomy, recommended metadata, quality, reachability, traceability, and stale-policy checks | Official requiredness |
| OWA Format Validation | npm run okf:validate:format | Repository formatting and canonical frontmatter order | Official structure |
| Combined Repository Policy | npm run okf:validate | Independent results for all configured layers and the aggregate OWA policy result | Rewriting layer identities |

The compatibility aliases npm run okf:validate:official and npm run okf:validate:extensions remain available. The migration adapter tools/okf/validate.mjs remains extension-only for its historical API.

## Official conformance rules

OKF v0.2 makes the root index, directory indexes, and logs optional. A present root index may omit frontmatter or declare only okf_version: 0.2. A present directory index has no frontmatter. A present log has ISO date group headings. Every other present Markdown file is a Concept and must have parseable top-level YAML with a non-empty string type. Unknown type values and producer-defined fields are accepted, including owa. Missing title, description, tags, generated, verified, and sources are accepted.

OKF v0.2 requires consumers to tolerate broken cross-links. The official layer therefore does not inspect Markdown link targets. The references layer may warn about them.

## Diagnostic contract

Every diagnostic has:

- layer
- ruleId and code
- severity: error, warning, or info
- path
- message
- optional line and column
- optional remediation and structured data

Stable prefixes are OKF-CONFORMANCE-, OWA-REF-, OWA-PROVENANCE-, OWA-EXT-, OWA-QUALITY-, OWA-FORMAT-, and INTERNAL-. A rule belongs to one layer only. Do not prefix an OWA policy rule with OKF-CONFORMANCE.

## Warnings and exit codes

Warnings are visible but non-blocking by default. Use --warnings-as-errors to make any selected-layer warning exit 1. The old --strict-warnings spelling is accepted only as a compatibility alias.

| Exit code | Meaning |
|---:|---|
| 0 | Requested layers completed without errors; warnings alone are allowed |
| 1 | Validation error, or warning-as-error |
| 2 | Invalid command or configuration |
| 3 | Unexpected internal validator failure |

Standalone commands calculate status from only their requested layer, with internal failures always visible. The combined command aggregates all mandatory OWA layers but reports Official OKF v0.2 Conformance independently.

## Source and network contract

The reference classifier distinguishes absolute URLs, GitHub blob permalinks, bundle-relative paths, relative paths, local absolute paths, and scope descriptors. A scope descriptor is not resolved as a filesystem path. Local targets are resolved only inside the official bundle boundary. A missing local target is OWA-REF-LOCAL-NOT-FOUND, not an official conformance error.

The provenance layer requires current concrete source values to use HTTPS GitHub blob URLs with full commit SHAs and rejects developer-local absolute paths. Mutable branch URLs are valid official URL syntax but emit OWA-PROVENANCE-MUTABLE-GITHUB-URL. Same-repository commit/path verification is local and deterministic when Git is available. External or unavailable targets are reported as not checked without a required network call.

Default network_mode is disabled. --remote enables bounded HEAD checks with timeout, redirect following, explicit rate-limit/auth handling, and deterministic timeout/network statuses. Remote validation is never required by pull requests or pushes.

## JSON contract

node tools/okf/cli.mjs validate --format json emits:

- schema_version
- specification_version
- specification_revision
- requested_layers
- layer_results
- diagnostics
- counts
- exit_code
- network_mode
- generated_at
- reference_checks
- provenance_checks

All paths in the report are repository-relative. Snapshot comparisons must normalize generated_at.

## Archive policy

`docs/archive/okf/` is a single historical archive root. Its Markdown files
remain readable and are retained for traceability, but they are not official
OKF input, active extension input, current configuration, or current
maintainer guidance. Documentation validation reads archived Markdown as UTF-8
but does not classify historical relative links as active documentation
failures; links in active documentation remain fully checked. Use
`docs/okf-conformance/` as the current entry point.

## CI contract

The OKF workflow runs separate named steps for conformance, references, provenance, extension, quality, format, combined policy, OKF tests, documentation, formatting, lint, and typecheck. Validator-focused tests run on Ubuntu and Windows. The optional remote job runs only on manual dispatch or the scheduled workflow. Each matrix run uploads its JSON report artifact when the workflow completes.

## Maintainer changes

When adding a rule:

1. Choose exactly one owning layer.
2. Use the stable layer prefix.
3. Add the rule to PHASE_04_NORMATIVE_RULE_CROSSWALK.csv or the relevant OWA coverage document.
4. Add an isolated deterministic fixture.
5. Assert the exact rule ID in a focused test.
6. Verify standalone layer isolation and combined reporting.
7. Run format, lint, typecheck, and OKF tests.

Never make a missing optional index, missing log, broken cross-link, unknown type, unknown producer field, or remote-unverified URL an official conformance failure. Never modify live Concept content merely to satisfy a validator fixture.
