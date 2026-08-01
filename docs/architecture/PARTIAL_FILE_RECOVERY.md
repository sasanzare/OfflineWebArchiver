# Partial File Recovery

Phase 7 provides a pure partial-file decision foundation and a deterministic loopback Range fixture; it is not a production Asset Downloader. Artifact paths must be portable and Project-relative. Resume is allowed only when bytes exist, the server supports Range, stored and remote validators both exist and match, size is plausible, and the resume offset equals durable bytes.

No Range support or a changed/missing validator causes restart from zero. Oversize or completed-content hash mismatch causes discard. A full-size matching file is complete. The fixture proves HTTP `206` append and SHA-256 promotion, plus full restart when Range is unavailable; no external host is contacted.
