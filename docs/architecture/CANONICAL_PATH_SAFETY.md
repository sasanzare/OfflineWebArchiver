# Canonical Path Safety

`validateCanonicalRelativePath` in Archive Core is the shared path contract for
Project-relative artifacts. It rejects host paths, UNC and drive paths,
separator confusion, dot segments, invalid or encoded traversal, reserved
Windows device names, control/non-portable characters, non-NFC values, long
paths/segments, and trailing dot/space names. It returns an NFC normalized path
and a case-folded collision key.

Persistence additionally checks the resolved path and existing ancestors for
symbolic links before writing or verifying a completed output. ZIP import,
Project Format, Recovery, and the Phase 17 Asset File Store delegate to the
helper rather than local mapping rules. Future Rewriter/Runtime code must use
the same boundary.

