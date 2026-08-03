# Phase 6 Backward Compatibility Report

`tools/okf/validate.mjs` and its exported legacy validation behavior remain unchanged. `npm run okf:validate` now uses the layered CLI while preserving all legacy manifest, registry, evidence, relationship, phase, path, and critical-requirement checks through the extension layer.

New focused commands add official, extension, quality, and JSON reporting without changing application runtime behavior. No registry path, manifest field, or evidence ID was changed.
