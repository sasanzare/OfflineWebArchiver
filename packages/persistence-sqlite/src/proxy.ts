import type { DatabaseSync } from "node:sqlite";
import {
  assertProxyMetadata,
  canonicalProxyIdentity,
  parseSecretRef,
  ProxyOperationError,
  type ProxyImportPersistenceError,
  type ProxyImportPersistenceResult,
  type ProxyMetadata,
  type ProxyRepositoryPort,
} from "@offline-web-archive/archive-core";

type Row = Record<string, unknown>;

export interface SqliteProxyRepositoryOptions {
  readonly now?: () => string;
}

function isUniqueConstraint(error: unknown): boolean {
  return error instanceof Error && /unique constraint failed/i.test(error.message);
}

function rowToProxy(row: Row): ProxyMetadata {
  try {
    const proxy: ProxyMetadata = {
      id: String(row["proxy_id"]),
      label: row["label"] === null ? null : String(row["label"]),
      protocol: String(row["protocol"]) as ProxyMetadata["protocol"],
      host: String(row["host"]),
      port: Number(row["port"]),
      bypass: JSON.parse(String(row["bypass_json"])) as readonly string[],
      credentialRef: row["credential_ref"] === null ? null : parseSecretRef(String(row["credential_ref"])).serialized,
      weight: Number(row["weight"]),
      priority: Number(row["priority"]),
      maxConcurrency: Number(row["max_concurrency"]),
      enabled: Number(row["enabled"]) === 1,
      healthState: String(row["health_state"]) as ProxyMetadata["healthState"],
      lastHealthCheckAt: row["last_health_check_at"] === null ? null : String(row["last_health_check_at"]),
      lastSuccessAt: row["last_success_at"] === null ? null : String(row["last_success_at"]),
      lastFailureAt: row["last_failure_at"] === null ? null : String(row["last_failure_at"]),
      latencyMs: row["latency_ms"] === null ? null : Number(row["latency_ms"]),
      successCount: Number(row["success_count"]),
      failureCount: Number(row["failure_count"]),
      consecutiveFailureCount: Number(row["consecutive_failure_count"]),
      successRate: Number(row["success_rate"]),
      cooldownUntil: row["cooldown_until"] === null ? null : String(row["cooldown_until"]),
      lastErrorCode: row["last_error_code"] === null ? null : String(row["last_error_code"]),
      lastErrorSummary: row["last_error_summary"] === null ? null : String(row["last_error_summary"]),
      createdAt: String(row["created_at"]),
      updatedAt: String(row["updated_at"]),
      revision: Number(row["revision"]),
    };
    assertProxyMetadata(proxy);
    return proxy;
  } catch (error) {
    if (error instanceof ProxyOperationError) throw error;
    throw new ProxyOperationError("PROXY_CONFIG_INVALID", "The persisted Proxy configuration is invalid");
  }
}

type SqlValue = string | number | null;

function toInsertValues(projectId: string, metadata: ProxyMetadata): readonly SqlValue[] {
  return [
    projectId,
    metadata.id,
    metadata.label,
    metadata.protocol,
    metadata.host,
    metadata.port,
    JSON.stringify([...metadata.bypass]),
    metadata.credentialRef,
    metadata.weight,
    metadata.priority,
    metadata.maxConcurrency,
    metadata.enabled ? 1 : 0,
    metadata.healthState,
    metadata.lastHealthCheckAt,
    metadata.lastSuccessAt,
    metadata.lastFailureAt,
    metadata.latencyMs,
    metadata.successCount,
    metadata.failureCount,
    metadata.consecutiveFailureCount,
    metadata.successRate,
    metadata.cooldownUntil,
    metadata.lastErrorCode,
    metadata.lastErrorSummary,
    metadata.createdAt,
    metadata.updatedAt,
    metadata.revision,
  ];
}

const INSERT_SQL = `
  INSERT INTO proxies (
    project_id, proxy_id, label, protocol, host, port, bypass_json, credential_ref,
    weight, priority, max_concurrency, enabled, health_state, last_health_check_at,
    last_success_at, last_failure_at, latency_ms, success_count, failure_count,
    consecutive_failure_count, success_rate, cooldown_until, last_error_code,
    last_error_summary, created_at, updated_at, revision
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const UPDATE_SQL = `
  UPDATE proxies SET
    label = ?, protocol = ?, host = ?, port = ?, bypass_json = ?, credential_ref = ?,
    weight = ?, priority = ?, max_concurrency = ?, enabled = ?, health_state = ?,
    last_health_check_at = ?, last_success_at = ?, last_failure_at = ?, latency_ms = ?,
    success_count = ?, failure_count = ?, consecutive_failure_count = ?, success_rate = ?,
    cooldown_until = ?, last_error_code = ?, last_error_summary = ?, created_at = ?,
    updated_at = ?, revision = ?
  WHERE project_id = ? AND proxy_id = ? AND revision = ?
`;

function updateValues(projectId: string, proxyId: string, expectedRevision: number, metadata: ProxyMetadata): readonly SqlValue[] {
  return [
    metadata.label,
    metadata.protocol,
    metadata.host,
    metadata.port,
    JSON.stringify([...metadata.bypass]),
    metadata.credentialRef,
    metadata.weight,
    metadata.priority,
    metadata.maxConcurrency,
    metadata.enabled ? 1 : 0,
    metadata.healthState,
    metadata.lastHealthCheckAt,
    metadata.lastSuccessAt,
    metadata.lastFailureAt,
    metadata.latencyMs,
    metadata.successCount,
    metadata.failureCount,
    metadata.consecutiveFailureCount,
    metadata.successRate,
    metadata.cooldownUntil,
    metadata.lastErrorCode,
    metadata.lastErrorSummary,
    metadata.createdAt,
    metadata.updatedAt,
    metadata.revision,
    projectId,
    proxyId,
    expectedRevision,
  ];
}

export function createSqliteProxyRepository(database: DatabaseSync, options: SqliteProxyRepositoryOptions = {}): ProxyRepositoryPort {
  const now = options.now ?? (() => new Date().toISOString());

  const getRow = (projectId: string, proxyId: string): Row => {
    const row = database.prepare("SELECT * FROM proxies WHERE project_id = ? AND proxy_id = ?").get(projectId, proxyId) as Row | undefined;
    if (row === undefined) throw new ProxyOperationError("PROXY_NOT_FOUND", "The Proxy was not found");
    return row;
  };

  const transaction = <T>(operation: () => T): T => {
    try {
      database.exec("BEGIN IMMEDIATE");
      const result = operation();
      database.exec("COMMIT");
      return result;
    } catch (error) {
      if (database.isTransaction) database.exec("ROLLBACK");
      if (error instanceof ProxyOperationError) throw error;
      if (isUniqueConstraint(error)) throw new ProxyOperationError("PROXY_ALREADY_EXISTS", "A Proxy with the same identity already exists");
      throw new ProxyOperationError("PROXY_CONFIG_INVALID", "The Proxy persistence operation failed safely");
    }
  };

  const repository: ProxyRepositoryPort = {
    async createProxy(input) {
      assertProxyMetadata(input.metadata);
      return transaction(() => {
        try {
          database.prepare(INSERT_SQL).run(...toInsertValues(input.projectId, input.metadata));
        } catch (error) {
          if (isUniqueConstraint(error)) throw new ProxyOperationError("PROXY_ALREADY_EXISTS", "A Proxy with the same identity already exists");
          throw error;
        }
        return rowToProxy(getRow(input.projectId, input.metadata.id));
      });
    },

    async getProxy(input) {
      return rowToProxy(getRow(input.projectId, input.proxyId));
    },

    async listProxies(input) {
      const rows = database.prepare("SELECT * FROM proxies WHERE project_id = ? ORDER BY priority ASC, proxy_id ASC").all(input.projectId) as unknown as Row[];
      return rows.map(rowToProxy);
    },

    async updateProxy(input) {
      assertProxyMetadata(input.metadata);
      if (input.metadata.id !== input.proxyId || input.metadata.revision !== input.expectedRevision + 1) {
        throw new ProxyOperationError("PROXY_REVISION_CONFLICT", "The Proxy revision is invalid");
      }
      return transaction(() => {
        const current = rowToProxy(getRow(input.projectId, input.proxyId));
        if (current.revision !== input.expectedRevision) throw new ProxyOperationError("PROXY_REVISION_CONFLICT", "The Proxy changed after it was read");
        try {
          const result = database.prepare(UPDATE_SQL).run(...updateValues(input.projectId, input.proxyId, input.expectedRevision, input.metadata));
          if (Number(result.changes) !== 1) throw new ProxyOperationError("PROXY_REVISION_CONFLICT", "The Proxy changed during the update");
        } catch (error) {
          if (isUniqueConstraint(error)) throw new ProxyOperationError("PROXY_ALREADY_EXISTS", "A Proxy with the same identity already exists");
          throw error;
        }
        return rowToProxy(getRow(input.projectId, input.proxyId));
      });
    },

    async deleteProxy(input) {
      transaction(() => {
        getRow(input.projectId, input.proxyId);
        const result = database.prepare("DELETE FROM proxies WHERE project_id = ? AND proxy_id = ?").run(input.projectId, input.proxyId);
        if (Number(result.changes) !== 1) throw new ProxyOperationError("PROXY_NOT_FOUND", "The Proxy was not found");
      });
    },

    async importProxies(input) {
      return transaction(() => {
        const result: { imported: number; updated: number; skipped: number; failed: number; errors: ProxyImportPersistenceError[] } = {
          imported: 0,
          updated: 0,
          skipped: 0,
          failed: 0,
          errors: [],
        };
        const seenIds = new Set<string>();
        const seenIdentities = new Set<string>();
        for (const item of input.items) {
          try {
            assertProxyMetadata(item.metadata);
            const identity = canonicalProxyIdentity(item.metadata);
            if (seenIds.has(item.metadata.id) || seenIdentities.has(identity)) {
              result.skipped += 1;
              result.errors.push({ record: item.record, code: "PROXY_ALREADY_EXISTS", message: "The import contains a duplicate Proxy identity" });
              continue;
            }
            seenIds.add(item.metadata.id);
            seenIdentities.add(identity);
            const existingById = database.prepare("SELECT * FROM proxies WHERE project_id = ? AND proxy_id = ?").get(input.projectId, item.metadata.id) as Row | undefined;
            const existingByIdentity = database.prepare("SELECT * FROM proxies WHERE project_id = ? AND protocol = ? AND host = ? AND port = ?").get(input.projectId, item.metadata.protocol, item.metadata.host, item.metadata.port) as Row | undefined;
            if (existingById !== undefined) {
              const current = rowToProxy(existingById);
              if (canonicalProxyIdentity(current) !== identity) {
                result.skipped += 1;
                result.errors.push({ record: item.record, code: "PROXY_ALREADY_EXISTS", message: "The Proxy identifier is already used by another identity" });
                continue;
              }
              const metadata: ProxyMetadata = { ...item.metadata, createdAt: current.createdAt, revision: current.revision + 1 };
              database.prepare(UPDATE_SQL).run(...updateValues(input.projectId, metadata.id, current.revision, metadata));
              result.updated += 1;
              continue;
            }
            if (existingByIdentity !== undefined) {
              result.skipped += 1;
              result.errors.push({ record: item.record, code: "PROXY_ALREADY_EXISTS", message: "A Proxy with the same identity already exists" });
              continue;
            }
            database.prepare(INSERT_SQL).run(...toInsertValues(input.projectId, item.metadata));
            result.imported += 1;
          } catch (error) {
            if (error instanceof ProxyOperationError && error.code === "PROXY_ALREADY_EXISTS") {
              result.skipped += 1;
              result.errors.push({ record: item.record, code: error.code, message: error.message });
              continue;
            }
            result.failed += 1;
            result.errors.push({ record: item.record, code: "PROXY_CONFIG_INVALID", message: "The Proxy import record could not be persisted" });
          }
        }
        return result;
      });
    },
  };
  return repository;
}
