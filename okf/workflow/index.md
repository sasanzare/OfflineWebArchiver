# Workflow

<!-- MAINTAINED NAVIGATION. Update when direct Concept children change. -->

This directory contains the selected queue, job-state, and rendering workflow Concepts.

- [Queue](queue.md) - Durable Page Job identity, ordering, and idempotency.
- [Page Job State Machine](job-state-machine.md) - Allowed processing and recovery transitions.
- [Rendering](rendering.md) - Bounded rendering and final artifact extraction.
- [Human-Paced Interaction](interaction.md) - Approved browser-native actions and redacted traces.
- [Job Attempts](job-attempts.md) - Attempt advancement and retained interruption history.
- [Scope Engine](scope-engine.md) - URL normalization, classification, and limits.
- [Site Profile](site-profile.md) - Portable scope-policy authority and revisions.
- [Crawl Run State](crawl-run-state.md) - Versioned durable Run lifecycle separate from pause control.

Phase 9 discovery and downloader workflows remain planned capabilities rather than implemented workflow surfaces. The Interaction workflow is a partial approved-plan foundation and does not replace discovery.
