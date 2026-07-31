# Product Phase 5 Security Review

## Scope

Reviewed Site Profile parsing/storage, URL normalization, domain/path/query/fragment rules, canonical/redirect classifiers, SQLite migration, CLI/Desktop transport, logging, and dependency changes. No network, DNS, crawler, browser automation, queue, authentication, proxy, or secret storage was introduced.

## Findings and controls

- Raw URLs are bounded to 8,192 characters; controls, NUL, backslashes, invalid percent escapes, credentials, and non-HTTP(S) schemes fail closed.
- IDNA uses ASCII/Punycode and domain rules are boundary-safe. Registrable domains use a bundled PSL through `tldts` `7.4.9`; authorization still requires an explicit rule.
- Sensitive query values are omitted before decision serialization. Logs contain command type, IDs, counts, hashes, and codes—not paths or URLs.
- IPv4/IPv6 loopback/private/link-local/multicast/reserved/unspecified literals are classified without DNS. Hostnames remain pending future dispatch-time DNS validation.
- Rule, seed, URL, known-identity, depth/page/redirect, and batch inputs are bounded. No dynamic regex or evaluation is accepted from a profile.
- Desktop retains sandbox, context isolation, no Node integration, exact path grants, sender/frame/URL checks, denied navigation/windows/downloads/permissions/webviews, and `connect-src 'none'`.
- Migration `003_add_site_profiles` is additive and checksum-protected. Current JSON and the database ledger must hash-match.

## Residual risk

Filesystem and SQLite cannot share a true atomic commit; lock + atomic replacement + rollback handles ordinary failure, and validation detects crash divergence. DNS rebinding cannot be closed before a network-dispatch phase. PSL data must be reviewed during dependency updates. These limitations are explicit and do not authorize requests.

## Result

Phase 5 security controls pass the automated architecture, security, contract, golden, unit, integration, CLI, and Electron gates. `npm audit` reports zero known vulnerabilities at implementation time.
