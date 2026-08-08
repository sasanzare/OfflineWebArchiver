# Product Phase 12 Security Review

## Scope and gate

This review covers the Manual Login and Secure Session Manager implementation.
The source, contract, persistence, fake-runtime integration, and redaction
evidence are present. The real Chromium fixture evidence is currently partial
because the pinned repository-owned Chromium could not be installed in the
validation environment: the approved Playwright download hosts returned DNS
`ENOTFOUND`. This is an environment limitation, not a claim that a system
browser fallback is acceptable.

## Threats and controls

| Threat | Control | Evidence |
|---|---|---|
| Password, OTP, CAPTCHA, or MFA value is captured | Manual headed Context; no form-value instrumentation; no credential fields in contracts or UI | `packages/browser-runtime/src/index.ts`; `packages/contracts/src/index.ts`; `tests/unit/session.test.ts` |
| Raw cookies/tokens reach normal storage or transport | Storage State is passed only to the Phase 11 Secret Store; safe metadata omits `secretRef` and payload | `packages/application-service/src/index.ts`; `tests/integration/session-lifecycle.test.ts` |
| Unapproved login/validation origin is reached | Explicit origin allowlist and Application Service URL policy; document navigation is rechecked | `packages/application-service/src/index.ts`; `packages/browser-runtime/src/index.ts` |
| A session is saved without authentication proof | Save requires literal confirmation and a configured validation URL/path/marker | `packages/contracts/src/index.ts`; `tests/integration/session-lifecycle.test.ts` |
| Reauthentication destroys a valid session | Old metadata/reference is retained until new validation and protected replacement succeed | `tests/integration/session-lifecycle.test.ts`; `packages/application-service/src/index.ts` |
| State is restored into an incompatible Context | Profile identifier/version and format versions are checked before secret resolution | `packages/archive-core/src/sessions.ts`; `packages/application-service/src/index.ts` |
| Restored state leaks into render or renderer contexts | Dedicated fresh authentication Contexts are owned by Browser Runtime; raw handles stay behind the port | `packages/browser-runtime/src/index.ts`; `tests/browser/session.test.ts` |
| Project crossover or deletion race | Project ownership checks, optimistic Session revision, scoped Secret Store references, idempotent delete | `packages/persistence-sqlite/src/index.ts`; `packages/archive-core/src/sessions.ts`; integration tests |
| Sensitive state appears in logs, reports, exports, screenshots, or diagnostics | Safe result projection, existing Phase 11 redaction/export/diagnostic policy, no Storage State result type | Phase 11 security tests; Session contract and integration tests |

## Residual risks and limitations

JavaScript and browser processes may retain copies that cannot be absolutely
zeroized, and filesystem deletion cannot guarantee media sanitization. Real
headed Chromium fixture execution remains to be rerun after the pinned browser
resource is available. Cross-platform browser provisioning and native Secret
Store qualification are not claimed here. Phase 13 OTP automation, Phase
14/15 proxy behavior, and later downloader/rewrite/API/runtime features remain
outside this phase.

