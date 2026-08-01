# Project Format Knowledge

Project format 1.1.0 remains compatible with 1.0.0 and enables portable `profile/config.json` plus the declared `crawlQueue` feature. Queue/Lease/Checkpoint/Recovery/Render rows live in SQLite schema 6; final HTML/optional PNG use fixed Project-relative paths. Browser resources never enter Project data.

Verified authority is `docs/architecture/PROJECT_FORMAT.md` plus the strict runtime schema in `packages/project-format`. All persisted internal paths are portable relative paths; host paths/tokens/secrets are not Queue fields. Auth/proxy roots remain future capability only.
