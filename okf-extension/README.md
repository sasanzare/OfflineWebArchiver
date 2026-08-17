# OfflineWebArchiver OKF Extensions

`okf/` is the official Google Open Knowledge Format v0.2 bundle. This top-level
directory contains OfflineWebArchiver-specific extensions that support, index,
validate, and report on that bundle.

Everything under `okf-extension/` is outside the official OKF bundle. These
extension files are not official OKF Concepts, and no file under this directory
should be counted when determining official OKF conformance.

The extension currently indexes Product Phase 10 as `PARTIAL`, Product Phase 11
as `PARTIAL`, Product Phase 12 as `PARTIAL`, and the historical Phase 13/14
records with their preserved status. Product Phase 15 is indexed as `VERIFIED`
within the Proxy Manager and Health Monitor boundary: the exact-HEAD evidence
runner, real Chromium protocol fixtures, security review, and documentation
records are registered. Product Phase 16 is indexed as `VERIFIED` within its
local Worker Pool and rate-limit scheduling boundary: focused Core/SQLite/
Browser Runtime evidence, schema 11 persistence, security review, and
documentation records are registered. Exact clean-HEAD release promotion and
authorized target-site multi-proxy evidence remain separate gates. Windows 10
is legacy/compatibility and Linux/macOS native evidence is deferred to future
versions. Product Phase 17 is indexed as `VERIFIED` within its explicit Asset
descriptor, scheduler-bound network, durable source/content, Range-resume, and
canonical path boundary. Product Phase 18 is indexed as VERIFIED within the
deterministic stored-content HTML/CSS rewrite, Route Map, Original Resource Map,
External Dependency Map, and separate atomic derived-output boundary. Product
Phase 19 is indexed as PARTIAL within the selective GET API capture,
deterministic replay identity, SQLite snapshot/body persistence, Browser Runtime
interception, exact mapped loopback Local Runtime, Strict Offline, and explicit
Service Worker policy boundary. Production Application Service preview
orchestration, target-site evidence, cross-platform evidence, and Phase 20
remain separate gates. The manifest remains
activated at Phase 8; later phases are recorded for traceability without
advancing the activated release.

Official validation and extension validation are logically separate. Official
validation scans only `okf/`; extension validation may consume both the official
Concepts and the project-specific material in this directory. Concepts remain
understandable without parsing extension JSON or depending on extension policy.

The dependency direction is one way: Concepts may carry optional `owa` bridge
identifiers; extension artifacts may consume Concept paths and links; extension
validation and reporting may consume both layers.

## Evidence views

- [Build evidence](evidence/builds.md)
- [Decision evidence](evidence/decisions.md)
- [Runtime evidence](evidence/runtime.md)
- [Source evidence](evidence/source.md)
- [Test evidence](evidence/tests.md)

## Maps

- [Dependency map](maps/dependencies.md)
- [Domain map](maps/domains.md)
- [System map](maps/system.md)
- [Traceability map](maps/traceability.md)

## Reports and validation

- [Decision report](reports/decisions.md)
- [Evidence report](reports/evidence.md)
- [Risk report](reports/risks.md)
- [Semantic validation rules](validation/rules/semantic-rules.md)
- [Phase 3 migration report](validation/reports/phase-03-migration-report.md)
- [Phase 10 partial evidence report](reports/evidence.md)
- Phase 11 implementation report: `docs/project/PHASE_11_IMPLEMENTATION_REPORT.md`
- Phase 11 security review: `docs/architecture/PHASE_11_SECURITY_REVIEW.md`
- Phase 13 implementation report: `docs/project/PHASE_13_IMPLEMENTATION_REPORT.md`
- Phase 13 closure/remediation report: `docs/project/PHASE_13_CLOSURE_REPORT.md`
- Phase 13 native evidence execution matrix: `docs/project/PHASE_13_EVIDENCE_EXECUTION_MATRIX.md`
- Phase 13 security review: `docs/architecture/PHASE_13_SECURITY_REVIEW.md`
- Phase 14 implementation report: `docs/project/PHASE_14_OTP_FLOW_ELEMENT_PICKER.md`
- Phase 14 security review: `docs/architecture/PHASE_14_SECURITY_REVIEW.md`
- Phase 15 implementation report: `docs/project/PHASE_15_IMPLEMENTATION_REPORT.md`
- Phase 15 security review: `docs/architecture/PHASE_15_SECURITY_REVIEW.md`
- Phase 16 implementation report: `docs/project/PHASE_16_IMPLEMENTATION_REPORT.md`
- Phase 16 security review: `docs/architecture/PHASE_16_SECURITY_REVIEW.md`
- Phase 17 implementation report: `docs/project/PHASE_17_IMPLEMENTATION_REPORT.md`
- Phase 17 security review: `docs/architecture/PHASE_17_SECURITY_REVIEW.md`
- Phase 18 implementation report: `docs/project/PHASE_18_IMPLEMENTATION_REPORT.md`
- Phase 18 architecture: `docs/architecture/HTML_REWRITER.md`
- Phase 18 security review: `docs/architecture/PHASE_18_SECURITY_REVIEW.md`
- Phase 18 ADR: `docs/project/adr/ADR-061-html-rewriter-route-and-dependency-maps.md`
- Phase 19 implementation report: `docs/project/PHASE_19_IMPLEMENTATION_REPORT.md`
- Phase 19 security review: `docs/architecture/PHASE_19_SECURITY_REVIEW.md`
- Phase 19 ADR: `docs/project/adr/ADR-062-api-capture-replay-and-isolated-runtime.md`
