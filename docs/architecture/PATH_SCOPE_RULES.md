# Path Scope Rules

Path rules operate on the normalized URL pathname. `exact` requires equality. `prefix` is segment-boundary aware: `/docs` matches `/docs` and `/docs/...`, not `/document`. `/` matches all paths. Deny rules run first, then allow rules. With no allow-path rule, an allowed domain permits every non-denied path.

Case is preserved and matching is case-sensitive. Dot segments follow the URL parser. Repeated slashes remain distinct. Encoded separators remain encoded. Query and fragment text are forbidden in a path rule.
