# Test Architecture

Unit tests cover contracts, pure Core, configuration, redaction, and CLI parsing/formatting. Integration tests cover Application Service orchestration/error translation and desktop transport authorization. Built-process tests cover CLI help/version/human/JSON/error behavior and a real hidden Electron renderer-to-Core path plus isolation properties.

Fitness gates separately validate type safety, build, source rules, formatting, dependency boundaries/cycles/public entries, contracts, desktop security, required docs/ADR sections, and canonical OKF semantics. Suite-specific commands are independent and rebuild prerequisites. Phase 3 has no crawler/browser/database fixture because those capabilities are intentionally absent.
