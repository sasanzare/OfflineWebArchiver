# Phase 7 CI Security Review

The workflow uses `pull_request` and `push`, not `pull_request_target`. Permissions are explicitly limited to `contents: read`; no secrets, write tokens, deployments, package publishing, or pull-request comments are used.

Only official GitHub actions are referenced at stable major versions: checkout v4, setup-node v4, and upload-artifact v4. Workflow commands do not interpolate OKF content, execute source references, or access remote source URLs. The validator treats repository content as input and generates only a repository-relative JSON artifact.
