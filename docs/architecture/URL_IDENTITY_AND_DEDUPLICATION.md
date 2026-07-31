# URL Identity and Deduplication

Identity algorithm `scope-identity-v1` is SHA-256 over UTF-8 bytes of `scope-identity-v1`, one newline, and the exact identity URL. The output is a lowercase 64-hex digest. The URL contains canonical scheme/host/port/path, sorted identity/functional/unknown-as-identity pairs with duplicates, and only policy-preserved fragments.

Known identity hashes are explicit evaluation input. A known identity does not consume the page-limit count again. A new eligible identity is rejected when `currentEligibleCount >= maxPages`; `null` is unlimited and zero permits no new identity. Phase 5 neither stores discovered identities nor creates jobs; durable deduplication belongs to Phase 6.
