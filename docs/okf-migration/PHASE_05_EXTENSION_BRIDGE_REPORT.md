# Phase 5 Extension Bridge Report

Official Concepts are human-readable sources of semantic knowledge. Optional `owa` IDs link outward to the extension layer; registries, maps, reports, and validation consume Concepts and upstream authorities and do not define Concept meaning.

The manifest and all eight JSON registries remain at their existing paths as transitional compatibility extensions because `tools/okf/validate.mjs` hard-codes those paths. `domains`, `evidence`, and `changes` remain authored extension authorities; `nodes`, `relationships`, `phases`, `decisions`, and `risks` are retained transitional indexes intended for Phase 6 derivation. The manifest is extension configuration only and is not an official `okf_version` declaration.

Extension Markdown is realized in `okf/extensions/`; legacy paths remain notices. A physical registry move is deferred to Phase 6 because the current validator requires `okf/manifest.json`, `okf/registry/*.json`, and two legacy validation Markdown paths.
