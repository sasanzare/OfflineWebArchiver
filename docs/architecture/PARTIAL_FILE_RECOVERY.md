# Partial File Recovery

Phase 7 provides the pure partial-file decision foundation. Product Phase 17
integrates that policy into the explicit-descriptor Asset Downloader through
the scheduler-bound network and filesystem capability ports. Artifact paths must
be portable and Project-relative. Resume is allowed only when bytes exist, the
server supports Range, stored and remote validators both exist and match, size
is plausible, and the resume offset equals durable bytes.

No Range support or a changed/missing validator causes restart from zero.
Oversize or completed-content hash mismatch causes discard. A full-size matching
file is complete. Phase 17 adds deterministic in-memory fixtures for `206`
append, durable interruption, final SHA-256 promotion, and Page↔Asset
deduplication; no external host is contacted.
