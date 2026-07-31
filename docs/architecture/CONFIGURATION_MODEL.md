# Configuration Model

Defaults are explicit and schema-validated. The only environment override is `OWAB_LOG_LEVEL` with `debug|info|warn|error`. Application name/version and contract version are build-owned. Runtime/platform facts expose only normalized Node version, operating-system family, and architecture.

No entire environment object is returned or logged. Target scope, authentication, proxy credentials, browser paths, project directories, and persistence settings do not exist in the production Phase 3 configuration contract.
