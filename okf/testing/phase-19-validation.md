---
type: Test Strategy
title: Phase 19 Validation
description: Focused evidence for selective API capture, replay enforcement, Local Runtime isolation, and Service Worker policy.
tags: [testing, phase-19, replay, runtime, security]
status: stable
---

# Phase 19 Validation

The focused command is `npm run test:phase19`. It builds the repository/test
TypeScript projects and runs serially because the browser and `.build-tests`
fixtures share resources.

The suite covers:

- Core identity normalization, sensitive-query rejection, capture eligibility,
  body markers, header sanitization, Service Worker profile decisions, and
  map-bounded runtime resolution;
- SQLite migration 013, content-addressed body persistence, deduplication,
  ambiguity, Project/Run/Revision scope, and tamper detection;
- Local Runtime exact-origin, Host/Origin, method, traversal, map, and
  loopback-only serving behavior;
- pinned Chromium capture of a JSON GET, strict replay fulfillment, unknown
  external miss abort, POST abort, and zero live dispatch after capture;
- real block/allow Service Worker behavior in the existing fixture.

The focused Phase 19 run passed 7/7 tests on 2026-08-17. This is local boundary
evidence, not authorized target-site evidence, cross-platform native evidence,
or Phase 20 security/reporting closure.

See [Network Replay](../architecture/network-replay.md), [Local Runtime](../architecture/local-runtime.md),
and [Service Worker Policy](../architecture/service-worker-policy.md).
