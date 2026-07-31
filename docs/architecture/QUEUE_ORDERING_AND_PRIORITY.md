# Queue Ordering and Priority

Priority policy version is `1`; valid priorities are integers `0..1000`. Explicit requested priority wins. Defaults are seed `1000`, manual `750`, canonical/redirect `625`, sitemap `600`, and other synthetic discovery `500`.

Claim order is exact and locale-independent:

1. `priority DESC`
2. `nextEligibleAt ASC`
3. `depth ASC`
4. `queueSequence ASC`
5. `jobId ASC` by ordinal code-unit comparison

Only due `pending` Jobs participate. Retry release orders `nextEligibleAt`, queue sequence, then Job ID; released Jobs retain their original queue sequence and priority. A lower-depth duplicate updates effective depth but does not recalculate priority or reopen terminal work.

Strict priority can starve low-priority work under an endless high-priority stream. Phase 6 records this open risk and does not invent aging or runtime rate control; bounded callers can choose explicit priority. Any future aging policy requires a versioned decision and deterministic migration.
