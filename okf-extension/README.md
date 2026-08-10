# OfflineWebArchiver OKF Extensions

`okf/` is the official Google Open Knowledge Format v0.2 bundle. This top-level
directory contains OfflineWebArchiver-specific extensions that support, index,
validate, and report on that bundle.

Everything under `okf-extension/` is outside the official OKF bundle. These
extension files are not official OKF Concepts, and no file under this directory
should be counted when determining official OKF conformance.

The extension currently indexes Product Phase 10 as `PARTIAL`, Product Phase 11
as `PARTIAL`, Product Phase 12 as `PARTIAL`, and Product Phase 13 as `PARTIAL`:
the hardening contracts are present, while real pinned-Chromium and native
platform evidence remain explicitly blocked. The manifest remains activated at
Phase 8; later phases are recorded for traceability without advancing the
activated release.

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
