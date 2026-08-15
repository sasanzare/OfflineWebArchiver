---
type: Test Strategy
title: Phase 15 Validation
description: Records proxy protocol, health, affinity, security, documentation, and exact-HEAD evidence validation.
tags: [testing, proxy, browser, security, migration]
status: stable
---

# Phase 15 Validation

Focused validation covers Core proxy policy, contract 1.11, SQLite schema 10,
Application Service credential/affinity orchestration, and real Chromium HTTP,
HTTPS, and SOCKS5 proxy fixtures. The fixture generates its local certificate
at test runtime and asserts a dead proxy does not produce a direct request.

The repository-owned runner is `tools/testing/run-phase15-evidence.mjs` and
writes a redacted bundle under
`.artifacts/phase15-evidence/final-native-windows-11-x64`. It runs the full
regression sequentially, focused package suites, build/typecheck/lint/format,
architecture, contracts, migrations, project format, browser verification,
security, secret leakage, docs, and OKF validators. The validator binds the
bundle to the current clean committed HEAD and requires the supported Windows
11 x64 environment.

Worker scheduling, rate-limit coordination, automatic rotation, downloader,
replay, and rewrite are not Phase 15 test claims.
