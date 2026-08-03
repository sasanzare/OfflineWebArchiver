# Requirements Traceability

## Product Phase 8 trace

| Requirement | Acceptance | Implementation | Direct evidence | Risks | Decisions | OKF |
|---|---|---|---|---|---|---|
| FR-RENDER-001..002, NFR-PORT-001, NFR-SEC-003 | AC-P08-001..011, AC-P08-015..016 | `browser-runtime`, `rendering`, Core ports, Application Service | browser/render unit, real Chromium integration, actual Page/Browser process-kill | R-002, R-009, R-090..097, R-100..101 | OD-066..073, OD-075..076; ADR-041..045, ADR-047..048 | OKF-NODE-P08-BROWSER-RENDER |
| FR-RECOVERY-001, FR-QUEUE-003, NFR-REL-001..002 | AC-P08-012..014 | fenced Render repository, schema 6, stage Checkpoints/Heartbeats/Pause/Resume | render lifecycle/fault plus recovery/concurrency/process-kill suites | R-098..099 | OD-074; ADR-046 | OKF-NODE-P08-FENCED-RESULTS |
| FR-CLI-001, FR-UX-002, NFR-MAINT-001 | AC-P08-017 | contract 1.5, CLI, isolated Desktop, architecture/docs/OKF | unit/CLI/Electron/architecture/security/docs/OKF gates | R-091, R-101 | ADR-041..048 | OKF-CHG-P08-001 |

**Document status:** Proposed baseline

**Owner:** QA Lead
**Last updated:** 2026-07-31

This document maps each requirement from
[Project Scope](../product/PROJECT_SCOPE.md) through the
[Acceptance Matrix](../product/ACCEPTANCE_MATRIX.md), planned implementation and
validation, [fixture category](../testing/TEST_FIXTURE_STRATEGY.md), and
[risk](RISK_REGISTER.md). Phase numbers refer to the [Phase Plan](PHASE_PLAN.md).

## Functional requirements

| Requirement | Acceptance criteria | Planned implementation → validation | Test category / activity | Principal risks |
|---|---|---|---|---|
| FR-AUTHZ-001 | AC-AUTHZ-001 | P5 → P20, P24 | FX-048; TS authorization preflight | R-026, R-027, R-037 |
| FR-PROJECT-001 | AC-PROJECT-001, AC-P04-001..004, AC-P04-014..015 | P4 → P4, P25 | Strict manifest/path/atomic lifecycle and FX-041 | R-013, R-031 |
| FR-PROJECT-002 | AC-PROJECT-002, AC-P04-005, AC-P04-008, AC-P04-021..022 | P4 → P17, P25 | Real SQLite reopen/identity/lock tests | R-012, R-013, R-046 |
| FR-PROJECT-003 | AC-PROJECT-004, AC-PROJECT-005, AC-P04-006..013 | P4 → P17, P25 | Migration backup/rollback/checksum/corruption; FX-037 | R-012, R-013, R-046 |
| FR-PROJECT-004 | AC-PROJECT-003, AC-P04-016..020, AC-CROSSPLATFORM-001 | P4, P25 → P11, P25 | Bounded hostile ZIP round-trip/move; FX-041 | R-006, R-031, R-045 |
| FR-SCOPE-001 | AC-SCOPE-001 | P5 → P5, P25 | Versioned URL corpus; FX-011 | R-008, R-027 |
| FR-SCOPE-002 | AC-SCOPE-002 | P5 → P20, P24 | FX-013, FX-048; request spy | R-026, R-027 |
| FR-SCOPE-003 | AC-SCOPE-003 | P5, P8 → P20 | FX-047, FX-048 | R-027, R-036 |
| FR-QUEUE-001 | AC-QUEUE-001, AC-P06-001..003, AC-P06-009..012, AC-P06-029..032 | P6 verified; scale/recovery extends P7/P17 | Schema 4, lifecycle/reopen/history/statistics integration | R-012, R-014, R-056, R-062, R-066 |
| FR-QUEUE-002 | AC-QUEUE-002, AC-P06-004..008, AC-P06-010, AC-P06-021..022 | P6 verified; discovery integration extends P8 | Database uniqueness, idempotency, multi-parent and concurrent duplicate fixtures | R-014, R-056, R-059, R-060, R-063 |
| FR-QUEUE-003 | AC-QUEUE-003, AC-P06-013..028, AC-P06-033..035, AC-RECOVERY-002 | P6 state/claim/retry verified; Lease/Crash Recovery planned P7 | State-pair validator, token/attempt integration, real SQLite concurrency, CLI/Electron/security | R-014, R-015, R-057, R-058, R-059, R-061, R-064, R-065 |
| FR-RECOVERY-001 | AC-RECOVERY-001, AC-RECOVERY-003 | P17 → P17, P24 | FX-036, FX-037, FX-038; TS-011..013 | R-011, R-015, R-017 |
| FR-RECOVERY-002 | AC-RECOVERY-004, AC-RECOVERY-005 | P9, P17 → P17, P24 | FX-039, FX-040; TS-014 | R-016, R-034 |
| FR-RENDER-001 | AC-RENDER-001 | P7 → P7 | FX-001, FX-002 | R-002, R-011 |
| FR-RENDER-002 | AC-RENDER-002, AC-RENDER-003 | P7 → P8, P18 | FX-003..006, FX-009 | R-007, R-009, R-028 |
| FR-RENDER-003 | AC-INTERACT-001 | P8 → P20 | Safe-interaction corpus; FX-047 | R-027, R-036 |
| FR-DISCOVERY-001 | AC-DISCOVERY-001, AC-DISCOVERY-002 | P8 → P18 | FX-007, FX-008, FX-013 | R-007, R-028 |
| FR-DISCOVERY-002 | AC-DISCOVERY-003 | P8 → P18 | FX-010, FX-011 | R-008, R-010 |
| FR-AUTH-001 | AC-AUTH-001 | P12 → P20, P24 | FX-018..020; TS-001 | R-021, R-026 |
| FR-AUTH-002 | AC-AUTH-002, AC-AUTH-003 | P12 → P17, P20, P24 | FX-025, FX-026; TS-003..005 | R-017, R-018, R-021 |
| FR-OTP-001 | AC-OTP-001, AC-OTP-002 | P13 → P19, P20 | FX-021..024; TS-002 | R-019, R-020 |
| FR-OTP-002 | AC-OTP-003 | P13 → P20 | FX-021..024, FX-046 | R-020, R-021 |
| FR-PROXY-001 | AC-PROXY-001, AC-PROXY-002, AC-PROXY-003, AC-PROXY-004 | P14 → P14, P20 | FX-027..030 | R-022, R-024 |
| FR-PROXY-002 | AC-PROXY-005 | P14 → P15 | FX-031..033 | R-023, R-024 |
| FR-PROXY-003 | AC-PROXY-006, AC-PROXY-007 | P14, P15 → P17, P20, P24 | FX-032, FX-033; TS-008, TS-009 | R-018, R-023 |
| FR-RATE-001 | AC-RATE-001, AC-RATE-002, AC-RATE-003 | P15 → P15, P20 | FX-031, FX-034, load scheduler | R-010, R-025 |
| FR-RATE-002 | AC-RATE-004, AC-RATE-005 | P15 → P20, P24 | FX-034, FX-035; TS-020 | R-025, R-026 |
| FR-ASSET-001 | AC-ASSET-001 | P9 → P18 | FX-009, FX-043 | R-016, R-034, R-035 |
| FR-ASSET-002 | AC-ASSET-002 | P9 → P17 | FX-012, FX-039, FX-040 | R-016, R-034 |
| FR-ARCHIVE-001 | AC-REWRITE-001 | P10 → P18, P25 | HTML/CSS rewrite corpus; FX-043, FX-044 | R-029, R-031 |
| FR-ARCHIVE-002 | AC-REWRITE-002 | P10 → P11, P25 | FX-041, FX-042 | R-029, R-031 |
| FR-API-001 | AC-API-001 | P16 → P20 | FX-016, FX-017 | R-027, R-030 |
| FR-API-002 | AC-API-002 | P16 → P20 | FX-045, FX-046 | R-021, R-030 |
| FR-API-003 | AC-API-003 | P16 → P18, P20 | FX-017, FX-042 | R-029, R-030 |
| FR-RUNTIME-001 | AC-RUNTIME-001 | P11 → P20, P25 | FX-042, socket/interface checks | R-029, R-036 |
| FR-RUNTIME-002 | AC-RUNTIME-002 | P11 → P18, P24 | FX-042, FX-047; TS-016 | R-029 |
| FR-REPORT-001 | AC-REPORT-001, AC-REPORT-002 | P18 → P18, P19, P20 | Versioned JSON/HTML goldens | R-021, R-035 |
| FR-REPORT-002 | AC-REPORT-003 | P18 → P18, P24 | FX-015, FX-043, FX-044 | R-007, R-036 |
| FR-UX-001 | AC-UX-001 | P19 → P19, P25 | User-facing string catalog | R-036 |
| FR-UX-002 | AC-UX-002 | P19 → P19, P25 | Keyboard workflow checklist; FX-022 | R-019, R-036 |
| FR-CLI-001 | AC-CLI-001 | P3, P18 → P20, P25 | CLI contract/policy parity | R-027, R-036 |
| FR-DIAG-001 | AC-SECURITY-002 | P20 → P20 | FX-046; bundle allowlist scan | R-021, R-022, R-030 |
| FR-PACKAGE-001 | AC-WINDOWS-001 | P21 → P21, P25 | Clean Windows VM packaged E2E | R-001..003, R-032, R-033 |
| FR-PACKAGE-002 | AC-LINUX-001 | P22 → P22, P25 | Approved clean Linux matrix | R-001, R-002, R-004, R-033 |
| FR-PACKAGE-003 | AC-MACOS-001 | P23 → P23, P25 | Approved Mac architecture/signing matrix | R-001, R-002, R-005, R-006, R-033 |
| FR-PACKAGE-004 | AC-CROSSPLATFORM-001 | P25 → P25 | FX-041; all-platform round trip | R-006, R-031 |
| FR-VALIDATE-001 | AC-VALIDATE-001 | P24 → P24, P25 | TS-001..020 and independent denominator audit | R-007, R-008, R-026, R-028, R-037 |

## Non-functional requirements

| Requirement | Acceptance criteria | Planned implementation → validation | Test category / activity | Principal risks |
|---|---|---|---|---|
| NFR-SEC-001 | AC-RATE-006, AC-AUTHZ-001, AC-SCOPE-002 | P5, P15, P20 → P20, P24 | FX-034, FX-048; all-path anti-evasion capture | R-025..027, R-037 |
| NFR-SEC-002 | AC-SECURITY-001 | P12–P16, P20 → P20, P25 | FX-018..030, FX-045, FX-046 | R-021, R-022, R-030, R-033 |
| NFR-SEC-003 | AC-SECURITY-003, AC-RUNTIME-001 | P11, P20 → P20, P25 | FX-042, FX-047 | R-004, R-029 |
| NFR-SEC-004 | AC-SECURITY-004 | P20 → P20 | Sanitized event schema and tamper fixture | R-021, R-027, R-032 |
| NFR-PRIV-001 | AC-PRIVACY-001 | P20 → P20, P24 | FX-017, FX-045, FX-046; deletion clock | R-021, R-030, R-037 |
| NFR-REL-001 | AC-REL-001 | P6, P17 → P17, P24 | FX-036..040 | R-011, R-014..016 |
| NFR-REL-002 | AC-REL-002 | P4, P17 → P17, P25 | Migration/corruption corpus; FX-037, FX-040 | R-012, R-013, R-016, R-034 |
| NFR-PERF-001 | AC-PERF-001 | P8, P15, P19 → P18, P25 | FX-010, FX-031, FX-034; saturation | R-008, R-010, R-025 |
| NFR-PERF-002 | AC-PERF-002 | P18 → P24, P25 | Approximately 600-page local/target benchmarks | R-001, R-010, R-034, R-035 |
| NFR-PORT-001 | AC-PORT-001 | P21–P23 → P25 | Clean OS packaged vertical slices | R-001..006, R-032, R-033 |
| NFR-PORT-002 | AC-PORT-002 | P4, P10, P25 → P25 | FX-041 and cross-platform product matrix | R-006, R-031 |
| NFR-UX-001 | AC-UX-003 | P19 → P19, P25 | Complete outcome-state language inventory | R-036 |
| NFR-UX-002 | AC-UX-004 | P19 → P19, P25 | Keyboard, focus, semantics and non-color review | R-019, R-036 |
| NFR-TEST-001 | AC-TEST-001 | P2–P25 → each gate, P25 | FX-001..048 plus target evidence | R-002, R-007, R-009, R-021 |
| NFR-MAINT-001 | AC-MAINT-001 | P3 → P19, P25 | Contract schemas and Core parity tests | R-002, R-013, R-028 |
| NFR-QUAL-001 | AC-QUALITY-001 | P18 → P24 | FX-015, FX-043, FX-044; independent recomputation | R-007, R-008, R-028, R-036 |
| NFR-KNOW-001 | AC-OKF-001, AC-OKF-002 | OKF Phase 0; P3 activation → every gate, P25 | Required-file/link/domain/critical-mapping audits | RISK-KNOW-001 |
| NFR-KNOW-002 | AC-OKF-004 | OKF Phase 0 policy; P3 validator → every gate, P25 | Evidence authority/path/method audit and planned-only negative case | RISK-KNOW-001, R-021, R-030 |
| NFR-KNOW-003 | AC-OKF-003, AC-OKF-006 | OKF Phase 0; P2–P25 → every phase gate | Phase record/change/evidence/mapping/hand-off checklist; activation rollback | RISK-KNOW-001 |
| NFR-KNOW-004 | AC-OKF-005 | P3 conflict schema; continuous → every affected gate, P25 | Controlled documentation-code conflict, resolution and history test | RISK-KNOW-001 |

## Product Phase 2 executable-evidence map

This map is limited to the experimental feasibility slice and does not replace
the production mappings above.

| Requirement | Phase 2 acceptance | Product phase | Executed test or check | Feasibility evidence | Risk | Decision | OKF domain |
|---|---|---|---|---|---|---|---|
| FR-PACKAGE-001 | AC-P02-001 | P2 | `npm run test:electron` | Electron 43.2.0 development smoke report | R-002, R-003 | OD-003, OD-027 | OKF-DOM-005, OKF-DOM-006, OKF-DOM-032, OKF-DOM-033 |
| FR-RENDER-001 | AC-P02-002 | P2 | `npm run test:integration`; `npm run verify:packaged-run` | Chromium 141.0.7390.37 launched from owned development/package roots | R-002, R-038, R-039 | OD-027 | OKF-DOM-012 |
| FR-RENDER-002 | AC-P02-003 | P2 | `tests/integration/workflow.test.ts` | Completion marker, delayed content, lazy state, 350 ms quiet window | R-009 | OD-006 | OKF-DOM-013, OKF-DOM-031 |
| FR-DISCOVERY-001 | AC-P02-004 | P2 | `tests/integration/workflow.test.ts` | Routes `/`, `/products`, `/products/example-item` recorded | R-007, R-009 | OD-012 | OKF-DOM-014, OKF-DOM-031 |
| FR-ARCHIVE-001 | AC-P02-005 | P2 | archive unit test and real workflow test | Atomic final HTML/evidence under unique Run ID | R-016, R-029, R-034 | OD-012 | OKF-DOM-024, OKF-DOM-041 |
| FR-PROJECT-004 | AC-P02-006 | P2 | metadata/path unit and integration assertions | Relative archive and browser resource paths | R-031 | OD-014 | OKF-DOM-008, OKF-DOM-041 |
| FR-RUNTIME-001 | AC-P02-007 | P2 | server/unit traversal tests | `127.0.0.1`, port `0`, MIME/fallback, traversal `403` | R-029 | OD-009 | OKF-DOM-026 |
| FR-RUNTIME-002 | AC-P02-008 | P2 | Electron and packaged smoke | Source port closed; expected offline content; no source-origin request | R-029, R-036 | OD-009, OD-012 | OKF-DOM-026, OKF-DOM-029 |
| FR-PACKAGE-001 | AC-P02-009 | P2 | `npm run package:windows`; `npm run verify:package` | 704.64 MiB x64 package, exact bundled executable, prohibited scan clear | R-001..003, R-032, R-033, R-040 | OD-003, OD-021, OD-027 | OKF-DOM-032, OKF-DOM-033 |
| NFR-PORT-001 | AC-P02-010 | P2 | `npm run verify:packaged-run` | Restricted `PATH`, downloads off, bundled browser and embedded Node run passed | R-003, R-038 | OD-003, OD-027 | OKF-DOM-033 |
| NFR-SEC-003 | AC-P02-011 | P2 | Electron smoke plus server/path tests | Isolated sandboxed renderers, exact bridge, origin restrictions, loopback containment | R-029, R-032 | OD-009 | OKF-DOM-029 |
| NFR-TEST-001 | AC-P02-012 | P2 | `npm test`, Electron smoke, package checks | 18 assertions plus all smoke/verifier checks passed | R-002, R-038, R-039 | OD-024, OD-027 | OKF-DOM-031, OKF-DOM-041 |
| NFR-PORT-001 | AC-P02-013 | P2 | Clean Windows VM/Sandbox test not run | Controlled local simulation only; clean-machine status `PARTIAL` | R-003 | OD-003 | OKF-DOM-033, OKF-DOM-041 |
| NFR-KNOW-003 | AC-P02-014 | P2 | Phase impact/link/ID validation | Phase evidence plus synchronized bootstrap records | RISK-KNOW-001 | OD-026, OKF-OD-* | OKF-DOM-038..041 |

## Product Phase 3 production architecture evidence map

| Requirement | Phase 3 acceptance | Product phase | Executed test or check | Production evidence | Risk | Decision | OKF domain |
|---|---|---|---|---|---|---|---|
| NFR-MAINT-001 | AC-P03-001..007, AC-P03-014..016, AC-P03-022..023 | P3 | install, typecheck, independent builds/tests, contracts and architecture checks | Root workspace, package exports, contract 1.0.0, ADR-001..008 | R-002, R-041, R-042 | OD-010, OD-011 | OKF-DOM-004, OKF-DOM-041 |
| FR-CLI-001 | AC-P03-005, AC-P03-009 | P3 | `npm run test:cli`; workspace build/test | Built CLI invokes service/Core for `system.describe`, stable help/version/output/exit | R-036, R-042 | OD-009 | OKF-DOM-005, OKF-DOM-007 |
| NFR-SEC-003 | AC-P03-008, AC-P03-012..013 | P3 | real Electron smoke and security check | Isolated renderer, exact bridge/channel, sender/frame/URL and navigation/permission restrictions | R-029, R-043 | OD-009 | OKF-DOM-006, OKF-DOM-029 |
| NFR-TEST-001 | AC-P03-003, AC-P03-006..017 | P3 | unit/integration/CLI/Electron plus semantic gates | Deterministic package-owned tests and built-process smokes | R-039, R-044 | OD-024 | OKF-DOM-031, OKF-DOM-041 |
| NFR-KNOW-001 | AC-P03-018, AC-P03-021 | P3 | `npm run okf:validate` | Canonical manifest/registries and zero critical orphans | RISK-KNOW-001, R-044 | OD-026 | OKF-DOM-001, OKF-DOM-041 |
| NFR-KNOW-002 | AC-P03-020 | P3 | OKF semantic validation and negative probes | Verified nodes have repository-relative evidence; future capabilities remain planned | RISK-KNOW-001, R-044 | OD-026 | OKF-DOM-031, OKF-DOM-041 |
| NFR-KNOW-003 | AC-P03-019, AC-P03-024 | P3 | migration prerequisite self-tests and promotion review | Phase/change/migration records; preserved bootstrap/spike | RISK-KNOW-001 | OD-026 | OKF-DOM-039..041 |
| NFR-KNOW-004 | AC-OKF-005 | P3 policy / continuous | Status/schema support; controlled history test remains future when first conflict exists | Conflict status/rules exist; no current conflict fabricated | RISK-KNOW-001 | OD-026 | OKF-DOM-041 |

## Product Phase 4 Project foundation evidence map

| Requirement | Phase 4 acceptance | Product phase | Executed test or check | Production evidence | Risk | Decision | OKF domain |
|---|---|---|---|---|---|---|---|
| FR-PROJECT-001 | AC-P04-001..004,014..015 | P4 | format/atomic unit and lifecycle integration | Manifest 1.0.0, portable paths, stable IDs, atomic promotion | R-013, R-031 | OD-014 | OKF-DOM-008 |
| FR-PROJECT-002 | AC-P04-005,008,021..022 | P4 | Node/Electron SQLite, identity and lock tests | Reopen/current/close and single writer through storage port | R-012, R-046 | OD-013 | OKF-DOM-009 |
| FR-PROJECT-003 | AC-P04-006..013 | P4 | migration validator, rollback, legacy backup/upgrade, corruption corpus | Schema 2, immutable history, SQLite API backup, fail-closed integrity | R-012, R-013 | OD-013, OD-023 | OKF-DOM-010 |

| FR-PROJECT-004 | AC-P04-016..020 | P4 | ZIP inventory/round-trip/attack/limit/cleanup tests | Container 1.0.0 preserves identity and excludes transient/secret roots | R-031, R-045 | OD-014 | OKF-DOM-011 |
| FR-CLI-001 | AC-P04-024 | P4 | built CLI all-operation smoke | Human/JSON Project operations and stable exits through service | R-036 | OD-009 | OKF-DOM-007 |
| NFR-SEC-003 | AC-P04-019,020,025 | P4 | hostile ZIP plus real Electron smoke/security gate | Approved path grants, isolated renderer, staged bounded import | R-045, R-046 | OD-009, OD-014 | OKF-DOM-029 |
| NFR-TEST-001 | AC-P04-027 | P4 | full unit/integration/CLI/Electron/OKF suite | Real filesystem/SQLite/process evidence without crawl mocks | R-012, R-013, R-045 | OD-013, OD-014 | OKF-DOM-031 |
| NFR-KNOW-001..004 | AC-P04-028..029 | P4 | docs and OKF validators | ADR-009..014, implementation/security/phase records and registries | RISK-KNOW-001 | OD-026 | OKF-DOM-038..041 |

## Product Phase 5 Profile and Scope evidence map

| Requirement | Acceptance | Phase | Test/evidence | Implemented control | Risks | Decisions | OKF domain/node |
|---|---|---|---|---|---|---|---|
| FR-AUTHZ-001 | AC-P05-001..004; AC-AUTHZ-001 remains defined for future Run start | P5 | profile lifecycle, CLI/Electron smoke | Strict secret-free profile, approval completeness, immutable Project/Profile revisions; no network path exists | R-053, R-055 | OD-028 | OKF-DOM-042 / OKF-NODE-P05-PROFILE-1 |
| FR-SCOPE-001 | AC-P05-005,011..014,017..022,027..031; AC-SCOPE-001 | P5 | scope unit and normalization golden | Engine 1 deterministic normalized/identity URL and SHA-256 | R-047, R-048, R-050 | OD-029, OD-031, OD-034 | OKF-DOM-043 / OKF-NODE-P05-SCOPE-1 |
| FR-SCOPE-002 | AC-P05-008..010,015..016,023..025,027 | P5 | scope/canonical/redirect tests | Exact/subdomain and exact/prefix rules, deny precedence, local relationship classification | R-049, R-051, R-054 | OD-030, OD-032, OD-033 | OKF-DOM-043 / OKF-NODE-P05-SCOPE-1 |
| FR-SCOPE-003 | AC-P05-006..007,020,026,034; AC-SCOPE-003 remains defined for future browser/request paths | P5 | adversarial URL/IP tests and security gate | HTTP(S) only, credential/sensitive denial, address preflight, downgrade denial, no network | R-052 | OD-035 | OKF-DOM-029 / OKF-NODE-P05-SECURITY |
| NFR-MAINT-001 | AC-P05-032..033 | P5 | contract/architecture/CLI/Electron tests | Contract 1.2.0 and dedicated package boundaries | R-041, R-042 | OD-034 | OKF-DOM-005..007 / OKF-NODE-P05-CONTRACT-1-2 |
| NFR-KNOW-001..004 | AC-P05-035 | P5 | docs and OKF validation | Phase/change/evidence/decision/risk/relationship synchronization | RISK-KNOW-001 | OD-026 | OKF-PHASE-005 |

## OKF traceability dimensions

Current traceability is the join of this document and
[canonical OKF extensions](../../okf-extension/README.md), with bootstrap traceability retained historically at `docs/archive/okf/bootstrap/BOOTSTRAP_TRACEABILITY.md`:

```text
Requirement
→ Acceptance Criterion
→ Product Phase
→ Test Category
→ Risk
→ Decision
→ OKF Domain
→ Evidence
```

The first five dimensions remain in the requirement tables above. The Phase 2
table now supplies actual spike evidence relations; the bootstrap map supplies
planned decision/domain/evidence dimensions for the remaining families until
canonical registries activate in Product Phase 3.

| Mapping dimension | Current authority | Canonical authority after activation | Current evidence rule |
|---|---|---|---|
| Requirement | `docs/product/PROJECT_SCOPE.md` | Requirement nodes linked to the same source authority | Definition is `VERIFIED`; implementation remains `PLANNED` |
| Acceptance | `docs/product/ACCEPTANCE_MATRIX.md` | Acceptance nodes and result evidence | Defined criteria do not imply passed behavior |
| Product Phase | `docs/project/PHASE_PLAN.md` | Phase registry and phase records | Planned phase only |
| Test category | Fixture/target strategy and this map | Test/fixture nodes and existing test evidence | Fixture plan is Level 3; no fake test evidence |
| Risk | `docs/project/RISK_REGISTER.md` | Risk/control/evidence registry | Risk exists; control is not mitigated without tests |
| Decision | `docs/project/OPEN_DECISIONS.md` and OKF question register | Decision/ADR registry | Recommendation is not outcome |
| OKF domain | `docs/archive/okf/bootstrap/KNOWLEDGE_DOMAIN_MODEL.md` | Domain and node registries | Planned implementation domain is not verified |
| Evidence | `docs/archive/okf/bootstrap/EVIDENCE_POLICY.md` | Evidence/relationship registries | Current implementation evidence is absent by design |

All functional/non-functional/acceptance families, fixtures, risks, decisions,
coverage, phase plan, DoD and target plan are mapped in the bootstrap traceability
document. Every current critical requirement, including `NFR-KNOW-001..004`, has
at least one OKF domain and future verification activity.

No source, test, migration, contract, build, runtime, or release evidence is
invented for unimplemented capabilities. Canonical records must enumerate exact
IDs instead of relying on prose ranges.

## Orphan audit

Current and future validation must calculate, rather than assume, these sets:

| Orphan class | Required result | Current baseline |
|---|---:|---:|
| Requirement without acceptance criterion | 0 | 0 |
| Acceptance criterion without a defined requirement | 0 | 0 |
| Requirement without test category/activity | 0 | 0 |
| Requirement without a planned implementation/validation phase | 0 | 0 |
| Critical requirement without an OKF domain | 0 | 0 |
| `VERIFIED` implementation claim without sufficient repository evidence | 0 | 0 |
| High/critical risk without mitigation owner | 0 | 0 |
| Future phase without an acceptance gate | 0 | 0 |

The validation procedure extracts definition-table IDs, expands range references
for review, checks exact acceptance IDs, and manually reviews grouped references
such as `FX-003..006`. After canonical activation it also validates domain,
decision and evidence registry joins. Any nonzero critical orphan blocks the
applicable phase and must be reflected in `HANDOFF.md`.

## Change control

- A new requirement must enter this map in the same change.
- A new acceptance criterion must name a defined requirement and appear in the
  mapped requirement row.
- A changed requirement/acceptance/test/risk/decision must update its OKF domain
  and evidence relationships in the same change.
- Removing or superseding an item preserves history and states the replacement.
- New high/critical risks cannot pass a phase gate without owner, mitigation,
  contingency, and relevant requirement/phase links.
