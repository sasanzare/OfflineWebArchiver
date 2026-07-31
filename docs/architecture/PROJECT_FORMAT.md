# Project Format

Product Phase 4 defines working Project format `1.0.0`. Runtime authority is `ProjectManifestSchema` in `packages/project-format/src/index.ts`; `packages/project-format/schema/project-manifest.schema.json` is the review/interchange projection. Both must change together.

## Canonical tree

```text
project.json
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

`profile/`, `auth/`, and `proxies/` are reserved for later phases and are not created. No queue, captured page, asset, API, auth, proxy, session, or crawler content exists in Phase 4.

The strict manifest records format/application versions, Project/Revision/Run UUIDs, name/slug, UTC creation/open/validation times, optional credential-free HTTP(S) base URL, relative database and content roots, schema version, lifecycle state, minimum compatible application, and future feature flags fixed to false. Unknown fields, non-UTC time, invalid UUID, host path, credential-bearing URL/secret field, unsupported format, or noncanonical database path fails closed. Serialization is deterministic two-space JSON plus one LF.

All internal paths are Project-relative and follow [Portable Path Rules](PORTABLE_PATH_RULES.md). Local command/response paths are transport state and never persisted in the manifest.

Compatibility policy accepts only format `1.0.0` in this build. Database schema 1 can migrate to 2; schema 0, unknown histories, and newer schemas are rejected. There is no best-effort downgrade.
