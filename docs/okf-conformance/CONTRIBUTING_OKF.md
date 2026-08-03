# Contributing to OKF

Follow this workflow for changes to the official Bundle, the OWA extension
layer, or their validators. The [maintenance guide](MAINTENANCE_GUIDE.md)
defines the shared ownership and provenance policy.

## Add a Concept

1. Choose the correct existing subject directory under `okf/` and a stable
   kebab-case filename.
2. Add valid top-level frontmatter with a non-empty `type`, a matching `title`,
   useful `description`, lifecycle `status`, and only applicable metadata.
3. Write a standalone H1 body and meaningful Markdown links.
4. Update the nearest `index.md`; update `okf/index.md` if top-level navigation
   changes.
5. Add portable, claim-matched `sources` and OWA evidence only when required.
6. Run `npm run okf:validate:conformance`, `npm run okf:validate:references`,
   `npm run okf:validate:provenance`, and `npm run test:okf`.

## Change a Concept

1. Decide whether the change is content, metadata, lifecycle, or identity.
2. Preserve the path for ordinary edits. For a rename, treat the path as an
   identity change and search all inbound links, indexes, sources, registries,
   tests, and active docs.
3. Update the official file and all affected navigation/mapping records in one
   reviewable change.
4. Preserve old phase reports as historical records; add an erratum or
   superseded note instead of rewriting their original conclusions.
5. Run official, reference, provenance, quality, format, and focused tests.

## Add or change a source

1. Prefer a primary source that directly supports the claim.
2. Use an HTTPS GitHub blob URL with a full commit SHA for a current concrete
   repository source. Use a documented scope descriptor when the source is a
   query or external evidence scope rather than a local file.
3. Never use drive, UNC, home, traversal, or other developer-local paths.
4. Keep `owa.verification_status` honest; source presence is not proof of
   verification.
5. If a source changes, update any extension evidence or registry record that
   names the old location and run both reference and provenance validation.

## Change a permalink

1. Verify the target commit exists and the repository-relative path is present
   in that commit.
2. Confirm the target still supports the claim and is not a mutable branch URL.
3. Update only the affected `sources` entry and related evidence mappings.
4. Run `npm run okf:validate:references` and
   `npm run okf:validate:provenance`; record any intentionally not-checked
   external target.

## Add extension documentation

1. Put OWA-specific guidance under `okf-extension/`, not under `okf/`.
2. Add a manifest, registry, map, or schema entry only when a machine
   consumer needs one; keep those files authored and reviewable.
3. Link the new material from the relevant extension README or map.
4. Run `npm run okf:validate:extension`, `npm run okf:validate:quality`, and
   `npm run okf:validate:format`.
5. Do not describe extension behavior as an official OKF requirement.

## Add a validation rule

1. Identify the one owning layer: official conformance, references,
   provenance, extension, quality, or format.
2. Assign a unique stable rule ID with that layer's prefix.
3. Document the rule in `VALIDATION_CONTRACT.md` and the applicable crosswalk
   or coverage record.
4. Add a small isolated fixture that proves the rule and its intended severity.
5. Add a focused assertion for the exact rule ID and test that standalone
   layers do not relabel the diagnostic.
6. Run `npm run test:okf`, the selected layer, and the combined validator.

Never turn an optional OKF field, broken cross-link, unknown type, unknown
producer field, or remote-unverified source into an official error merely to
make project policy easier to enforce.

## Add a test fixture

1. Place the fixture in the narrowest relevant directory under
   `tests/okf/fixtures/`.
2. Make its purpose explicit in the test name and fixture contents.
3. Keep negative fixtures isolated so they cannot be discovered as production
   Bundle content or scanned as active documentation.
4. Assert the layer, rule ID, severity, and important structured fields.
5. Run the focused OKF suite and confirm no fixture was accidentally moved into
   `okf/`, `okf-extension/`, or the archive.

## Update CI

1. Change `.github/workflows/okf-validation.yml` only for active paths and
   commands.
2. Preserve separate official, OWA, docs, format, lint, and typecheck steps.
3. Keep the optional remote job bounded and limited to manual/scheduled runs.
4. Update the validation contract and maintainer guide when the command or
   evidence surface changes.
5. Run the affected local commands and inspect the workflow diff for archived
   path references.

## Review a pull request

1. Confirm the change is scoped to the declared layer and does not redesign
   validators or rewrite official Concepts broadly.
2. Check path boundaries, source provenance, metadata ownership, and historical
   preservation.
3. Search for deprecated paths, including `okf-bootstrap/`,
   `docs/okf-migration/`, `okf/extensions/`, `okf/manifest.json`,
   `okf/registry/`, and `okf/validation/`.
4. Classify each remaining reference as active code, active documentation,
   historical evidence, fixture data, or archive content.
5. Verify active links and read the archive policy before accepting a historical
   broken link.
6. Review command output and ensure warnings were not silently treated as
   official failures.

## Pre-merge checklist

- [ ] Official Bundle and OWA extension boundaries remain intact.
- [ ] Concept/index/log rules and source provenance are correct.
- [ ] Extension metadata is under `okf-extension/` and is labeled project-specific.
- [ ] Relevant focused tests and validation layers pass.
- [ ] `npm run docs:validate` passes for active documentation.
- [ ] `npm run format:check`, `npm run lint`, and `npm run typecheck` pass.
- [ ] `npm run test` and `npm run build` pass for a repository-wide change.
- [ ] No active code, workflow, package script, or current documentation points
      to an archived path.
- [ ] Historical records were preserved and any archive disposition is recorded
      in the Phase 5 report/disposition CSV when applicable.
- [ ] No official conformance requirement is claimed for OWA-only policy.
