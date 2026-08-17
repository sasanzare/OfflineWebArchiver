---
type: Data Model
title: Replay Snapshots and Runtime Events
description: Project/Run/Revision-scoped replay metadata, content-addressed response bodies, and bounded runtime leakage events.
tags: [data, sqlite, replay, integrity, privacy]
status: stable
---

# Replay Snapshots and Runtime Events

SQLite schema 13 stores `replay_snapshots` and `replay_runtime_events`.
Snapshots are keyed by Project, Run, Project Revision, deterministic replay
identity, and response body SHA-256. Response bytes are stored outside SQLite
under `api/responses/<sha256>.bin` and are written atomically before a complete
row is committed. Reads verify ownership, byte count, and digest.

Persisted request metadata contains only selected identity headers. Sensitive
headers and body values are not stored. Runtime events contain bounded safe
URLs, match state, reason, method, resource type, scope identifiers, and strict
mode state; they do not contain response bodies or raw credentials.

See [Project Format](project-format.md), [Network Replay](../architecture/network-replay.md),
and [Phase 19 validation](../testing/phase-19-validation.md).
