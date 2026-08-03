# Dependency Map

Scope Engine depends on `tldts@7.4.9` and existing `zod@4.4.3`. Product Phase 8 adds internal Browser Runtime and Rendering packages plus `playwright-core@1.56.1`.

Dependencies point inward: application shells use Application Service, which composes Core Scope, Queue, Recovery, Browser, and Render ports; SQLite persistence implements durable ports. Only Browser Runtime imports Playwright. Desktop and CLI do not depend on Playwright or persistence, and no production dependency points to `spikes/`.
