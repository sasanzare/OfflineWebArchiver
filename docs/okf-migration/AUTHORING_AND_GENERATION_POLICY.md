# Authoring and Generation Policy

## Policy Goal

The repository must have one editable authority for each fact. Generated artifacts make authoritative knowledge searchable, navigable, or testable; they do not create a second authority.

## Artifact Classification

| Artifact | Classification | Authority | Owner | Regeneration or review rule |
|---|---|---|---|---|
| Official Concept Markdown | Human-authored | Authoritative for the migrated Concept, subject to linked upstream authorities | Knowledge owner and reviewer | Reviewed as normal documentation; never overwritten by a generator |
| Root `bundle/index.md` | Human-authored | Authoritative for bundle scope and top-level navigation intent | Documentation owner | Review whenever a top-level category changes |
| Directory `index.md` | Tool-generated | Derived navigation | Index generator | Regenerate after Concept add, remove, rename, type, or summary change |
| Official `log.md` | Not used | None | None | Must not be created unless the decision is superseded |
| Reference Concepts | Human-authored by default | Authoritative only for the repository's description of a source | Subject owner | Review source attribution and freshness |
| Extension manifest | Human-authored | Authoritative project-extension configuration | OKF tooling owner | Schema-validate after edits |
| Domain registry | Human-authored extension | Authoritative for project-only domain vocabulary | Architecture owner | Review alongside taxonomy and mapping changes |
| Evidence registry | Human-authored extension | Authoritative for evidence IDs and repository evidence locations | Quality owner | Validate existence and policy on every change |
| Node registry | Tool-generated | Derived from official Concepts | Registry generator | Regenerate after Concept metadata/path changes |
| Relationship registry | Tool-generated | Derived from Markdown links and approved extension relationship annotations | Registry generator | Regenerate after link/annotation changes |
| Phase registry | Tool-generated | Derived from Phase Record Concepts plus extension-only annotations | Registry generator | Regenerate after Phase Record changes |
| Decision and risk registries | Tool-generated indexes | Derived from their external authorities and linked Concepts | Registry generator | Regenerate when source decisions/risks change |
| Change registry | Human-authored extension | Authoritative migration/change ledger | Migration owner | Append or amend through review; do not regenerate |
| Evidence and map Markdown | Human-authored extension until generators exist | Explanatory/reference-only | Extension owner | Must identify its machine authority and stale risk |
| Validation schemas and semantic rules | Human-authored extension | Authoritative for project extension validation policy once activated | Validator owner | Version and test with validator changes |
| Validation and conformance reports | Derived report | Non-authoritative result for declared inputs and commit | Validator | Regenerate; never edit pass/fail results manually |
| Phase Record Concepts | Human-authored | Authoritative historical narrative; not current status authority | Phase owner | Freeze after correction and record material amendments |
| Migration compatibility map | Tool-generated, migration-only | Derived from `CONTENT_MIGRATION_MAP.md` and implemented paths | Migration tool | Regenerate through Phase 8; delete only after approval |

## Authoring Rules

1. Authors edit Concepts, designated authored extension data, and source policies only.
2. A Concept describes its subject completely enough to read without extension JSON.
3. When an external project document remains authoritative, the Concept states that relationship and links to it; it does not silently fork the fact.
4. Phase 3 metadata supports discovery and governance but does not replace the body.
5. Authored files must not contain generated tables unless explicit region delimiters and ownership are defined first.

## Generation Rules

1. Every generator declares its input set, owned outputs, deterministic ordering, and version.
2. Generators read official Concepts or authoritative authored extensions and write only derived artifacts.
3. No generator edits Concept bodies or the authored root index.
4. Generation must be deterministic for the same repository tree and tool version.
5. A failed generation leaves the prior output intact or removes a temporary file; it never leaves partial output as valid.
6. Generated output must be reproducible without network access unless the command explicitly produces an external-source snapshot.
7. Circular generation is prohibited: output from generator A cannot be an authority used to reconstruct A's own source or any upstream Concept.

## Generated-File Markers

Phase 3 freezes the required marker semantics. The final Phase 6 syntax appropriate to each output format must communicate:

- that manual edits are prohibited;
- the owning generator command;
- the authoritative input family;
- the generator version or contract version;
- the source commit or content digest when useful.

Frozen design examples, not implemented production markers:

```text
<!-- GENERATED FILE. DO NOT EDIT. Source: official Concepts. -->
```

```json
{
  "_generated": {
    "notice": "Do not edit",
    "source": "okf/bundle"
  }
}
```

Phase 3 must not add timestamps that make otherwise identical generation nondeterministic.

Official generated Concepts use `generated.by` and repository-required UTC `generated.at`. Human-authored or human-owned AI-assisted Concepts omit `generated`; Git remains their authoring history. Fully generated Concepts are never manually patched. Reserved directory indexes cannot carry frontmatter and therefore use only the body marker. The authored root index is denylisted.

## Overwrite Protection

- Generators use an explicit allowlist of owned paths.
- An output without the expected generated marker causes a hard stop rather than overwrite.
- The root index, Concept files, authored registries, and extension README are denylisted.
- Generation writes to a temporary sibling and atomically replaces the target only after validation.
- A generated output with uncommitted manual changes fails the check and directs the contributor to regenerate or restore it; the tool does not discard work.

## Regeneration and Stale Detection

Phase 6 should provide a check mode that generates to a temporary location and compares content. CI in Phase 7 runs check mode and fails when committed derived outputs differ. Dependency digests may accelerate checks but cannot be the sole correctness test.

A report is stale when its recorded input commit/digest differs from the validated tree. A registry is stale when a Concept, link, or authoritative annotation changes without corresponding deterministic output. Staleness is an extension-validation failure, not an official-conformance failure.

## Source-of-Truth Rules

- Official Concepts: semantic knowledge authority after each Concept's declared cutover.
- External product, ADR, source, test, or migration documents: retain the specific authority assigned in `SOURCE_OF_TRUTH_MAP.md`.
- Generated indexes and reports: never authority.
- Evidence registry: authority for evidence identity and location, not for the truth of an implementation claim.
- Relationship registry: search/index representation of authored links or annotations, not an independently editable graph.
- Compatibility mappings: transition aids only.

## CI Expectations for Later Phases

Phase 7 may add local and CI gates only after Phase 6 commands are stable. The gates should:

1. validate official v0.2 conformance at the declared `okf/bundle/` root;
2. validate project extensions separately;
3. check generated artifacts in no-write mode;
4. report broken project links as extension-policy failures;
5. verify no generated tool changes authored paths;
6. run without silently repairing files;
7. retain distinct exit summaries for official and extension results.

This Phase 2 document defines policy only; it does not implement a generator, marker, schema, validator, or CI workflow.
