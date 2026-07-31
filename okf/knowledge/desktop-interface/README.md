# Desktop Interface Knowledge

Product Phase 6 adds English Queue summary, filter, bounded list, detail/history, duplicate explanation, and controlled enqueue/claim/complete/fail simulation to the existing Profile/Scope UI. Renderer sandbox/context isolation, the two-method sender-authorized bridge, exact Project path grants, denied navigation/permissions/downloads/webviews, and absence of renderer filesystem/SQLite/network primitives remain enforced.

The production Electron shell is English-only and exposes only `execute` and `selectPath` bridge methods. Renderer isolation, sandboxing, sender validation, navigation denial, permission denial, and no remote content are directly tested.
