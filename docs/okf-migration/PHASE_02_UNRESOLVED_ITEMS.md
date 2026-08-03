# Phase 2 Unresolved Items

## Result

No material architecture, taxonomy, path, preservation, or compatibility question remains unresolved at the end of Phase 2. Phase 3 is not blocked.

The repository evidence was sufficient to choose:

- `okf/bundle/` as the official root and `okf-extension/` as its sibling extension root;
- a 14-type taxonomy;
- no official `log.md`;
- authored official Concepts with generated extension indexes;
- preservation of all current registries and evidence through validated compatibility cutover;
- an exact disposition for every current Markdown file.

## Deferred Implementation Choices That Do Not Reopen Phase 2

These are assigned work, not owner decisions:

| Item | Fixed boundary | Phase responsible | Can migration design continue? |
|---|---|---|---|
| Exact frontmatter field syntax and extension namespace | Must implement the approved taxonomy and authority direction | 3 | Yes |
| Canonical serialization of recommended bundle-root Markdown links | Must preserve the fixed target paths and ordinary Markdown semantics | 3 | Yes |
| YAML parser and schema implementation | Must not make official validation stricter than v0.2 | 3 and 6 | Yes |
| Generator command names and marker syntax | Must follow the authored/generated classifications | 3 and 6 | Yes |
| Exact legacy retention duration | No deletion before Phase 8 audit and explicit approval | 8 | Yes |
| Whether approved CI is introduced | Local deterministic gates must exist first | 7 | Yes |

If later repository evidence contradicts a Phase 2 decision, the change must be recorded as a superseding architecture decision with an updated migration map. Convenience alone is not sufficient to reopen the design.
