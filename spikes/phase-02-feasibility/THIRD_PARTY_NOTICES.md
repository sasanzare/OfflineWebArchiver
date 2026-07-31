# Third-Party Notices — Product Phase 2 Spike

This experimental spike is not a production distribution. The packaged directory
contains Electron, Playwright, Chromium, and their transitive runtime files.

- Electron 43.2.0 — MIT license. The packaged runtime also carries Electron's
  `LICENSE.electron.txt` and Chromium's `LICENSES.chromium.html` files.
- Playwright 1.56.1 and playwright-core 1.56.1 — Apache License 2.0.
- Playwright Chromium 141.0.7390.37 (revision 1194) — Chromium project
  licenses. The browser's license resources and Electron's Chromium notice file
  remain in the packaged directory.

The complete installed-package inventory, license metadata source, inclusion
classification, and review limitations are generated in `DEPENDENCIES.md` by
`npm run dependencies:report`. Package metadata is not a substitute for legal
review of every transitive license text.
