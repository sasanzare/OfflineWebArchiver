# Product Phase 8 Performance Observations

**Environment:** Windows x64, Node.js 24, Playwright 1.56.1, Chromium 141.0.7390.37 revision 1194  
**Date:** 2026-08-01

The retained automated test output is the measurement authority. The real fixture lifecycle test, including multiple successful and bounded-failure renders, completed in approximately 8-10 seconds in observed final runs. The Browser lifecycle test completed in approximately 12-18 seconds; the full four-case process-kill suite completed in approximately 14-16 seconds, with Windows process enumeration accounting for much of that wall time. The final warm `npm test` run completed 84 tests in 71.3 seconds. These are suite wall-clock observations, not per-page SLAs.

Each committed result records its own navigation, stability, and total Render duration plus HTML/screenshot byte lengths. Browser startup duration and OS process memory are not yet persisted, so no values are claimed. Default limits are 30 seconds total Render, 15 seconds navigation, 12 seconds stability, 8 MiB HTML, 8 MiB PNG, 100 evidence entries, one active Job, 100 Page sessions per Browser Process, and 30 minutes per Browser Process.
