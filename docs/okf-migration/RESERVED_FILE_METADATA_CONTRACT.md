# Reserved File Metadata Contract

Audit date: 2026-08-03

## Root `index.md`

`okf/index.md` is the bundle root. Official Google OKF v0.2 permits it to omit frontmatter or to contain only `okf_version`. OfflineWebArchiver repository policy requires exactly:

```yaml
---
okf_version: "0.2"
---
```

No Concept metadata is permitted. Its body provides the H1, scope, and links to all populated top-level official directories and the project extension documentation.

## Directory `index.md`

A non-root `index.md` is reserved navigation and has no frontmatter. The nine final directory indexes are human-maintained, direct-child navigation. They are not Concepts and are not marked as generated. Repository quality validation requires each populated official directory to have an index and requires all Concepts to be reachable from the root.

## `log.md`

No `log.md` is used. If introduced, it must have no frontmatter, use `YYYY-MM-DD` date headings, keep entries newest first, and remain prose rather than a Concept. Its introduction requires focused official and policy fixtures.

## Validation boundary

The official layer enforces the specification's reserved-file exceptions. Repository policy separately enforces the exact root version declaration and required navigation. Broken links and missing optional indexes are tolerated by official OKF consumers but fail or warn under the stricter repository layers.
