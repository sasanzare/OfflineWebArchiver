# Checkpoint Model

Checkpoint model version 1 is an immutable, Job/attempt/Fencing-scoped progress record. Each save assigns the next sequence and links `supersedes_checkpoint_id`; older rows remain auditable. Payloads are canonical JSON, at most 16 KiB and six levels deep, and keys resembling credentials, cookies, authorization, tokens, passwords, or API keys fail closed.

Job Checkpoints capture phase, progress, optional portable output path, and bounded payload. Run Checkpoints snapshot control state and Queue counts. Artifact Checkpoints capture a portable relative path, byte counts, expected length, optional SHA-256/validator, resume offset, generation, and committed flag. Saving any owner-controlled Checkpoint requires a valid active Lease.

Checkpoint history is bounded to 200 records per query. Unknown model versions are not silently interpreted.
