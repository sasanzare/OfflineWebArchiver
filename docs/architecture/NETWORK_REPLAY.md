# Network Replay Contract

`packages/archive-core/src/network.ts` defines replay contract version 1. The
future Browser Runtime implementation will intercept at Browser Context scope,
canonicalize HTTP/HTTPS GET and HEAD requests, look up a deterministic method
plus URL key, fulfill exact matches, and record/abort misses according to
Strict Offline Mode.

The contract deliberately excludes sensitive request/response headers from
replay identity and metadata. It exposes a bounded safe URL only. It does not
implement a response store, downloader, API capture, or full offline runtime.
Phase 18 now provides stored-content HTML/CSS rewriting and dependency metadata
separately; it does not change this runtime contract.

Replay and rewrite are separate: Phase 18 maps stored references to canonical
Project resources, while Phase 19 will control network fulfillment and runtime
replay. Service Worker policy is selected by Site Profile and must be explicitly
reconciled with Context replay before implementation.

