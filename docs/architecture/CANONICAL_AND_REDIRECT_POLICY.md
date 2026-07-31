# Canonical and Redirect Policy

Canonical classification is local computation over supplied values: `accepted-same-identity`, `accepted-new-identity`, `alias`, `ignored-external`, `rejected-out-of-scope`, `rejected-invalid`, or `conflict`. Supplied alias edges are traversed deterministically; returning to the source or revisiting an edge yields `conflict` with `CANONICAL_CYCLE`. The engine never fetches a canonical target.

Redirect classification accepts supplied 301/302/303/307/308 facts and returns `follow-in-scope`, `follow-approved-external`, `stop-external`, `stop-denied`, `stop-invalid`, `stop-loop`, or `stop-max-redirects`. Identity hashes detect loops. Redirects do not increase content depth. HTTPS-to-HTTP downgrade is denied unless the profile explicitly allows it. No response or redirect is fetched in Phase 5.
