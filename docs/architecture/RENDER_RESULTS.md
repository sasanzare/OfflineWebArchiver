# Render Results and Artifacts

**Result schema:** 1  
**SQLite schema:** 6

A successful Render Result records Project/Run/Job/attempt identity, safe requested/final URLs, HTTP status, content type, safe title, quality, timestamps/durations, browser/Playwright/engine/context versions, and bounded evidence. Evidence includes warnings/errors from console, page errors, failed requests, redirects, blocked-request count, and a truncation flag. It excludes response bodies, request bodies, cookies, authorization headers, and form values.

Rendered HTML is stored at `pages/<job-id>/rendered.html`, bounded to 8 MiB by default. Optional PNG is stored at `pages/<job-id>/screenshot.png`, bounded to 8 MiB and disabled by default. Both use portable Project-relative paths and SHA-256 descriptors in `completed_outputs`.

Artifact files are written atomically before the SQLite commit. The fenced transaction inserts the immutable result, output descriptors, Queue completion/attempt/transition/Lease updates, and final event. A crash after file write leaves no false database result; a crash after database commit replays the existing result by operation/result identity. Completed-output verification detects missing, size-mismatched, and hash-mismatched artifacts without silently re-rendering a terminal Job.
