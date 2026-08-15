---
type: Data Model
title: Proxy Metadata
description: Defines the schema 10 Project-owned proxy identity and health metadata model.
tags: [data, proxy, sqlite, health, secrets]
status: stable
---

# Proxy Metadata

SQLite schema 10 adds the Project-owned `proxies` table through migration
`010_add_proxies`. The unique identity is Project, protocol, normalized host,
and port. Rows contain label, bypass hosts, weight, priority, concurrency,
enabled state, health state, timestamps, latency, success/failure counters,
success rate, cooldown deadline, safe error code/summary, revision, and an
opaque `credential_ref`.

Username/password bytes are not columns and are not part of `ProxyMetadata`.
The Secret Store owns credential material. Existing schema-9 projects migrate
forward without rewriting previous ledgers. See [Database](database.md), [Proxy Manager](../architecture/proxy-manager.md), and [Proxy Security](../security/proxy-security.md).
