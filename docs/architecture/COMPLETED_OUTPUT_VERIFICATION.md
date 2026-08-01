# Completed Output Verification

A completed-output descriptor binds a Job to a portable relative path, expected byte length, SHA-256 digest, and `size-and-sha256` policy. Verification resolves inside the Project root, rejects traversal and symbolic links, and classifies missing, size-mismatched, hash-mismatched, or verified output.

Recovery preserves a terminal `completed` Job when every descriptor verifies. Invalid output is reported for explicit follow-up; Phase 7 does not silently reopen terminal work. Hashing is intentionally bounded by descriptor inventory but can be costly for large future artifacts, so retention/frequency remains a measured future decision.
