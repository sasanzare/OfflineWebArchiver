# Project Format

## Product Phase 8 artifacts and Phase 10 compatibility

Project format remains `1.1.0`. Render HTML and optional screenshot files live under fixed portable paths `pages/<job-id>/rendered.html` and `pages/<job-id>/screenshot.png`; SQLite schema 7 owns Render and Interaction metadata and SHA-256 descriptors. Browser binaries, manifests, caches, profiles, Interaction plans, and Playwright dependencies are runtime/package resources and are never exported inside a portable Project unless a later explicitly versioned export contract permits them.

## Product Phase 7 compatibility

Project format remains `1.1.0`; minimum application compatibility becomes `0.8.0`; SQLite schema becomes `6`. New durable values stay in SQLite and all artifact/output references remain portable relative paths. Lease Tokens, host absolute paths, Browser resources, and runtime process IDs are not portable Project content.

Current Project format is `1.1.0`. It remains backwards-readable with `1.0.0`; implemented feature states are `scopePolicy` and `crawlQueue`. `profile/config.json` is an approved portable/exported root created only by `profile.create`; Queue state resides in `database/crawl.db`; auth/proxy secret roots remain excluded.

Product Phase 4 established format `1.0.0`; Product Phase 5 extends it compatibly to `1.1.0`. Runtime authority is `ProjectManifestSchema` in `packages/project-format/src/index.ts`; the JSON Schema is the review/interchange projection. Both must change together.

## Canonical tree

```text
project.json
profile/config.json       created after Site Profile creation
database/crawl.db
database/backups/          created only when migration backup is needed
pages/
assets/css/
assets/js/
assets/images/
assets/fonts/
assets/media/
api/responses/
runtime/
reports/
logs/                      excluded from export
temp/                      excluded from export
```

`profile/` is implemented; `auth/` and `proxies/` remain reserved and are not created. Schema 4 may contain synthetic Page Jobs and histories, but no captured page, asset, API, auth, proxy, session, Lease, Heartbeat, Checkpoint, or crawler output exists.

The strict manifest records format/application versions, Project/Revision/Run UUIDs, name/slug, UTC lifecycle times, optional credential-free HTTP(S) base URL, relative roots, schema version, lifecycle state, minimum compatible application, and declared features. Unknown fields, non-UTC time, invalid UUID, host path, credential-bearing URL/secret field, unsupported format, or noncanonical database path fails closed. Serialization is deterministic two-space JSON plus one LF.

All internal paths are Project-relative and follow [Portable Path Rules](PORTABLE_PATH_RULES.md). Local command/response paths are transport state and never persisted in the manifest.

Compatibility policy accepts formats `1.0.0` and `1.1.0` in this build. Supported database schemas migrate forward through schema 7; schema 0, unknown histories, and newer schemas are rejected. Opening an older manifest may add implemented Queue/Recovery/Render/Interaction-compatible tables after migration; the default Interaction Profile remains disabled. There is no best-effort downgrade.
