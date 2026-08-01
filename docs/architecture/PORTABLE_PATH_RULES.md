# Portable Path Rules

## Phase 7 artifacts

Checkpoint/output paths use forward-slash relative segments, reject absolute/drive/backslash/NUL/empty/dot/parent segments, and are bounded to 2,048 characters. Verification resolves beneath the Project root and rejects symbolic links. No Lease or Checkpoint stores a host root.

Project-internal and archive paths are UTF-8 Unicode NFC strings using `/`. They are relative to Project root, at most 240 characters, with segments at most 120 characters.

The validator rejects:

- empty, `.`, `..`, or empty segments;
- `/`, `\`, drive prefixes, UNC/device forms, or any backslash;
- controls, NUL, `< > : " | ? *`;
- trailing dot/space;
- case-insensitive Windows device names such as `CON`, `AUX.txt`, `COM1`, and `LPT9`;
- non-NFC spelling;
- exact or case-folded archive collisions.

The adapter joins validated segments beneath a known Project root. Manifests never store host absolute paths. Export/import do not follow symlinks. Cross-platform tests include Windows, POSIX, separator, traversal, reserved-name, Unicode, and case-alias corpora.

The 240-character policy is deliberately below common legacy Windows limits and can be revisited only with a format/version compatibility review.
