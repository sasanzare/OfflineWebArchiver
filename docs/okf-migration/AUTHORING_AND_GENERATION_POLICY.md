# Final Authoring and Generation Policy

Audit date: 2026-08-03

## Current ownership

| Artifact | Ownership | Authority | Required update method |
|---|---|---|---|
| Normal Concept | Human-authored and reviewed | Human-readable knowledge | Edit the Concept, its portable sources, links, and related extension IDs together |
| Root `index.md` | Human-maintained | Bundle identity and top-level navigation | Update only for top-level structure changes |
| Directory `index.md` | Human-maintained navigation | Direct-child discovery | Update when a direct Concept is added, removed, renamed, or materially retitled |
| Extension Markdown | Human-authored | Explanatory or historical unless it names an external authority | Update with its registry or policy subject |
| Manifest | Human-authored configuration | Extension version and locations | Update with schema and validator changes |
| Registries | Human-authored structured data | Project-specific IDs, evidence, and typed graph semantics | Update atomically with affected Concepts and run extension validation |
| Production schemas | Human-authored validation policy | JSON structure | Update with tests and version review |
| Migration reports | Historical authored records | Historical audit evidence | Do not rewrite except for explicit correction or supersession notices |

## Generated artifacts

The final repository has no automatically generated OKF artifact. Phase 8 removed inaccurate generated-file claims from the nine directory indexes because no producer existed. Consequently there is no regeneration command to run and no retained generated output to hand-edit.

Future generated artifacts may be introduced only with all of the following in one reviewed change:

1. an explicit input set and owned-output allowlist;
2. deterministic ordering and serialization;
3. a documented producer command and version;
4. a no-write check mode used by CI;
5. collision protection that never overwrites authored files;
6. regression tests for stale, missing, and manually modified output;
7. an update to the extension inventory and source-of-truth map.

Official Concepts that use `generated` metadata must follow official actor semantics. Repository policy additionally requires a UTC `generated.at`. Human-authored Concepts omit `generated`.

## Review sequence

Edit authoritative input, update affected navigation and extension mappings, run `npm run test:okf`, run `npm run okf:validate`, and review the `OKF Validation` CI result. Never repair validation failures silently or copy generated-looking data between authorities.
