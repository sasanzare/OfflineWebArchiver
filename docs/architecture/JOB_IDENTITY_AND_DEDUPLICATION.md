# Page Job Identity and Deduplication

`jobId` is a random UUID used for references. Logical identity is enforced independently by SQLite uniqueness over:

```text
projectId + runId + profileRevisionId + engineVersion + identityHash + jobType(page)
```

`identityHash` is the Scope Engine 1 SHA-256 hash of the Product Phase 5 identity URL. Tracking and sensitive classifications omitted from identity therefore deduplicate; functional-query values and Profile-preserved fragments remain distinct. Profile revisions and engine versions never mix. A future engine may coexist without silently reinterpreting an old Job.

A duplicate enqueue returns structured `existing` with the original Job instead of a generic error. `BEGIN IMMEDIATE`, the database unique constraint, and tests using separate SQLite connections ensure concurrent callers still create one logical Job. Canonical or redirect observations use distinct discovery types; Phase 6 does not fetch either relation or merge aliases automatically.

Deduplication never discards provenance. Every distinct parent/source/type/depth/decision relationship is recorded idempotently. Effective Job depth is the minimum valid discovered depth, while historical depths remain in `job_discoveries`. Rediscovery never reopens a terminal Job.
