# Phase 6 Validator Architecture

`tools/okf/cli.mjs` provides deterministic human and JSON reports. `discovery.mjs` classifies sorted repository-relative artifacts; `frontmatter.mjs` parses the restricted safe YAML subset; `official.mjs` validates official requirements; `policy.mjs` validates repository policy, formatting, and quality; and `validate-all.mjs` wraps the retained legacy registry validator as the extension layer.

The layers are `official`, `policy`, `extension`, `quality`, and `format`. Only error-severity diagnostics affect the exit status. Extension failures are never relabeled as official failures.
