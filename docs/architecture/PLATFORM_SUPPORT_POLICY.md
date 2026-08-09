# Supported Platform Policy

Windows 11 x64 is the primary supported platform for the Phase 13 product
baseline. Windows 10 is legacy/optional and requires an explicit compatibility
decision before release claims. The pinned Playwright/Chromium line and native
Electron/Secret Store behavior must be validated on Windows 11 first.

Linux and macOS, plus non-x64 architectures, remain compatibility targets only
until the following evidence exists: clean install/build, Project create/open/
export/import, SQLite migration and lock behavior, Browser provisioning and
sandbox behavior, Secret Store provider qualification, path/case/symlink tests,
and Electron smoke evidence. No Phase 13 report promotes those platforms based
on source portability alone.

The policy inputs for a future support decision are OS lifecycle/security
support, Electron and Chromium support, native protected-storage guarantees,
filesystem semantics, architecture availability, CI coverage, and reproducible
packaging.

