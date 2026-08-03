# Reserved-File Metadata Contract

## Root `index.md`

Target for the Phase 4 execution slice: `okf/index.md`.

The Phase 2 design used `okf/bundle/index.md`; `OKF-P4-A001` records the explicit Phase 4 root amendment. The reserved-file rules below are unchanged.

The root index is a reserved navigation file, not a Concept. It is human-authored and repository-required. Official v0.2 permits frontmatter here and nowhere else among index files. The complete allowed mapping is:

```yaml
---
okf_version: "0.2"
---
```

`okf_version` is repository-required, quoted string `"0.2"`. `type`, `title`, `description`, `generated`, `verified`, `sources`, `status`, `stale_after`, and `owa` are prohibited. The body H1 supplies the display title and links every populated top-level directory index with concise scope descriptions. It does not duplicate Concept bodies, phase state, registries, or reports.

Validation: wrong/missing version, extra frontmatter key, multiple frontmatter blocks, non-root use, or Concept metadata is a reserved-file repository `ERROR`. A consumer that does not understand the declared official version should still attempt best-effort consumption.

## Directory `index.md`

A non-root `index.md` is a reserved navigation file and contains no frontmatter. Phase 2 classifies populated directory indexes as generated. Generation provenance appears only in the body marker/comment because official v0.2 forbids frontmatter here.

The body contains an H1, one-level grouped links to direct Concepts/subdirectories, and linked descriptions where available. It does not recursively inventory the whole bundle or reproduce metadata tables. Its entries use relative links appropriate to the directory.

Validation: any opening frontmatter delimiter or metadata key is a reserved-file `ERROR`. Missing optional official index is not an official error, but a missing repository-required populated-directory index is a repository error after Phase 4 activates that directory. Stale generated contents are an extension/generation error.

## `log.md`

Phase 2 explicitly omits `log.md`; no log schema is created. This is not a claim that official OKF forbids it.

If a later superseding decision adopts a log:

- it is a reserved file, not a Concept, with no frontmatter;
- it may appear at any hierarchy level;
- its body is a flat date-grouped history, newest group first;
- date headings are `## YYYY-MM-DD` and are mandatory official syntax;
- entries are prose bullets; a leading bold action word is conventional only;
- actor metadata is not placed in frontmatter; attribution may be prose/Git;
- it complements rather than duplicates Git and Phase Record Concepts.

For the current contract, creating any production `log.md` is a repository `ERROR`/migration scope violation. The invalid fixture checks structural behavior only; it does not authorize creation.

## Schema Coverage and Procedural Checks

`schema/root-index.schema.json` models the only allowed root metadata. `schema/directory-index.schema.json` models metadata absence, but filename/root position and the absence of delimiters require procedural checks. No log-entry schema is warranted while the artifact is deliberately unused.
