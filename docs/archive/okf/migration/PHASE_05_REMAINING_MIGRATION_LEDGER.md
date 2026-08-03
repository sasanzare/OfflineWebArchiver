# Phase 5 Remaining Migration Ledger

Starting commit: `ee8058f887d5024a8e7f6b93b2646b59c66f1e22`. The 34 deferred rows reconcile to 19 Concepts and 15 extension documents. Every source path remains as a transitional compatibility artifact until Phase 8.

| Group | Sources | Action | Target class | Result |
|---|---:|---|---|---|
| Evidence guides | 5 | Create target and retain source | Extension documentation | `okf-extension/evidence/*.md` |
| Living knowledge | 19 | Create target and retain source | Official Concept | Architecture 3; Data 1; Workflow 3; Recovery 6; Security 2; Operations 3; Testing 1 |
| Product reports and maps | 7 | Create target and retain source | Extension documentation | `okf-extension/reports/*.md`, `okf-extension/maps/*.md` |
| Root and validation documents | 3 | Create target and retain source | Extension documentation | `okf-extension/README.md`, `okf-extension/validation/**` |

Three new populated-directory indexes were added for Security, Operations, and Testing.

All 34 source paths, targets, and their final treatment are enumerated by the frozen source rows in `CONTENT_MIGRATION_MAP.md`; no source has an unknown action.
