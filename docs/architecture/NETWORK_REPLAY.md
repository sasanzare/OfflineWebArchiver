# Network Replay Contract

`packages/archive-core/src/network.ts` defines replay contract version 1. The
future Browser Runtime implementation will intercept at Browser Context scope,
canonicalize HTTP/HTTPS GET and HEAD requests, look up a deterministic method
plus URL key, fulfill exact matches, and record/abort misses according to
Strict Offline Mode.

The contract deliberately excludes sensitive request/response headers from
replay identity and metadata. It exposes a bounded safe URL only. It does not
implement a response store, downloader, API capture, HTML rewrite, or full
offline runtime in Phase 13.

Replay and rewrite are separate: replay controls network fulfillment, while a
later rewriter maps captured references to canonical Project paths. Service
Worker policy is selected by Site Profile and must be explicitly reconciled
with Context replay before implementation.

