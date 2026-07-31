# Query and Fragment Policy

Every query key is `identity`, `functional`, `tracking`, `ignored`, `denied`, or the explicit unknown default (`identity`, `ignored`, or `denied`). Key matching is case-insensitive; original key/value encoding is serialized deterministically. Duplicate pairs are preserved. Denied keys make the URL ineligible. Tracking and ignored keys remain in the normalized URL but not identity. Sensitive keys are removed from both outputs and never logged or persisted.

The default profile classifies common `utm_*`, click IDs, and marketing IDs as tracking, and common token/password/session keys as sensitive and ignored. This list is versioned profile data, not a hidden heuristic.

Fragments use one of three explicit policies: remove all; preserve all; or preserve only `#/` hash routes. Fragment behavior contributes to identity only when preserved. Query-like fragments containing a recognized sensitive key are removed from normalized, display, and identity URLs with `SENSITIVE_FRAGMENT_REMOVED`, even under a preserve policy.
