# ADR-047: Opt-In Bounded Render Screenshot

## Status
Accepted — 2026-08-01.

## Context
Screenshots aid diagnosis but can retain sensitive visual content and increase storage.

## Decision
Screenshot capture is disabled by default. An explicit per-Render option captures one viewport PNG, bounded to 8 MiB, at a fixed Project-relative path with SHA-256. It is not automatically shown in logs or error messages.

## Alternatives
Always-on, full-page, unbounded, and external-path screenshots were rejected.

## Consequences
Operators opt into the privacy/storage cost; Desktop shows only a safe summary/path.

## Security Impact
No screenshot is taken without explicit request; future retention/redaction policy remains open.

## Reliability Impact
Oversize capture fails explicitly and cannot create a false completed result.

## Concurrency Impact
Capture occurs inside the single active Page lifecycle.

## Persistence Impact
Optional descriptor and completed-output row are committed with the Render Result.

## Migration Impact
Schema 6 screenshot columns are nullable and constrained.

## Testing Impact
Unit and real Chromium tests verify default-off, PNG capture, size descriptor, and result replay.

## Portability Impact
PNG and Project-relative paths are platform-neutral.

## Related Requirements
FR-RENDER-001, NFR-PRIV-001, NFR-SEC-002.

## Related Acceptance Criteria
AC-P08-015.

## Related Risks
R-100.

## Related Open Decisions
OD-075.

## Related OKF Domains
OKF-DOM-013, OKF-DOM-028.
