# Phase 3 — False-Positive Regression Corrections

These tests use isolated temporary copies of the official fixture or extension root. They never mutate the live `okf/` or `okf-extension/` trees.

| Historical/invalid input | Old behavior | New behavior | Proving test |
|---|---|---|---|
| Markdown Concept without frontmatter | Discovery classified it as unknown and it could escape Concept validation. | Every non-reserved `.md` is a Concept; missing frontmatter emits `OKF-FRONTMATTER-MISSING`. | `concept without frontmatter is rejected instead of treated as exempt` |
| Malformed YAML | Generic classification could hide parse failure. | YAML parser failure emits `OKF-YAML-INVALID`. | `malformed YAML is rejected with a YAML diagnostic` |
| Concept without `type` | No precise required-field diagnostic. | Emits `OKF-TYPE-MISSING`. | `missing and empty Concept type are rejected` |
| Concept with empty `type` | Empty values were not explicitly separated from missing metadata. | Emits `OKF-TYPE-EMPTY`. | `missing and empty Concept type are rejected` |
| Invalid root index | Root index errors were not represented as a strict root-index rule. | Emits `OKF-INDEX-ROOT-FRONTMATTER`. | `invalid and missing root indexes are rejected` |
| Missing root index | Discovery could return a partial tree without a diagnostic. | Emits `OKF-INDEX-ROOT-MISSING`. | `invalid and missing root indexes are rejected` |
| Arbitrary nested Markdown without frontmatter | Directory naming and discovery classification could create an exemption. | Recursive discovery validates it as a Concept. | `concept without frontmatter is rejected instead of treated as exempt` |
| Extension documentation copied under `okf/` | Special extension-documentation/legacy handling could bypass official rules. | It is official Concept content and emits `OKF-FRONTMATTER-MISSING`. | `arbitrary nested Markdown and copied extension documentation are not exempt` |
| `okf/extensions/` directory | Historical name could receive special treatment. | Directory names have no exemption semantics. | `a directory named extensions cannot bypass official discovery` |
| Broken local source | Policy mixed source portability with URL checks and did not provide a dedicated source rule. | Emits `OKF-SOURCE-NOT-FOUND`. | `broken local sources and bundle-escaping traversal are rejected` |
| Source path escaping `okf/` | Parent traversal was not resolved against the actual Concept location. | Emits `OKF-SOURCE-TRAVERSAL` before filesystem access. | `broken local sources and bundle-escaping traversal are rejected` |
| Invalid GitHub blob reference | A URL could be treated as a generic valid URL without immutable semantics. | Emits `OKF-SOURCE-PERMALINK-NOT-IMMUTABLE`. | `invalid and mutable GitHub blob references are not reported as immutable` |
| GitHub branch URL (`blob/main`) | Mutable branch refs were not distinguished from immutable sources. | Branch refs fail the full-SHA rule. | `invalid and mutable GitHub blob references are not reported as immutable` |
| Broken internal Markdown link | Link checks were mixed into quality and could be misreported as official conformance. | Emits a separate `OKF-LINK-BROKEN` warning; `--strict-warnings` can make it blocking. | `broken internal Markdown links produce an explicit reference diagnostic` |
| Invalid extension manifest | Extension failures were wrapped as one generic diagnostic. | Emits `OWA-EXT-MANIFEST-SCHEMA` under the extension layer. | `extension manifest schema violations are isolated to the OWA extension layer` |
| Registry path to removed file | Registry checks did not have a stable path diagnostic. | Emits `OWA-EXT-PATH-NOT-FOUND`. | `registry references to removed files are rejected by extension validation` |
| Unexpected validator exception | Exception handling could be hidden behind a successful aggregate command. | Emits `OKF-INTERNAL-UNEXPECTED-EXCEPTION` and exits non-zero. | `unexpected validator exceptions become non-zero internal diagnostics` |

The regression tests also prove that extension Markdown outside `okf/` is not counted as an official Concept and that official-only validation succeeds without running extension validation.
