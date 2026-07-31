# URL Normalization

Scope Engine `1` applies this order: bound and reject raw controls/backslashes/bad percent escapes; parse and resolve against source, request, or Profile Base URL precedence; accept only HTTP(S); reject credentials; canonicalize an IDNA ASCII lowercase host and trailing dot/default port; apply WHATWG dot-segment path behavior while preserving case, repeated slashes, and encoded separators; classify/sort query pairs while preserving duplicates; remove sensitive fragments and apply fragment policy; then build normalized and identity URLs. Leading/trailing spaces follow WHATWG trimming, while tabs, controls, and nulls fail before parsing.

Absolute, protocol-relative, root-relative, path-relative, query-relative, and fragment-relative forms use the WHATWG URL implementation. Paths are URL paths, never filesystem paths. Percent escape hex is uppercase. The engine does not Unicode-decode encoded `/` or `\\` into separators.

`normalizedUrl` retains non-sensitive query pairs, including tracking pairs, in deterministic key/value/original-index order. `identityUrl` omits tracking/ignored/sensitive pairs. Sensitive query and recognized query-like fragment values are absent from every decision. Fragment modes are `ignore-all`, `preserve-all`, and `preserve-hash-routes`; hash routes require `#/`.
