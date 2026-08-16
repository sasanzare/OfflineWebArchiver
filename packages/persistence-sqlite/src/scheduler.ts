import type { DatabaseSync } from "node:sqlite";
import { canonicalOrigin, type OriginRateLimitState, type SchedulerStateRepositoryPort } from "@offline-web-archive/archive-core";

type Row = Record<string, string | number | null>;

export interface SqliteSchedulerRepositoryOptions { readonly now?: () => string; }

function timestamp(value: string, field: string): string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) throw new Error(`${field} is invalid`);
  return new Date(Date.parse(value)).toISOString();
}

function identifier(value: string, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 200) throw new Error(`${field} is invalid`);
  return value;
}

function rowToState(row: Row): OriginRateLimitState {
  return {
    projectId: String(row["project_id"]),
    runId: String(row["run_id"]),
    origin: canonicalOrigin(String(row["origin"])),
    cooldownUntil: row["cooldown_until"] === null ? null : timestamp(String(row["cooldown_until"]), "cooldownUntil"),
    lastStatus: row["last_status"] === null ? null : Number(row["last_status"]),
    updatedAt: timestamp(String(row["updated_at"]), "updatedAt"),
  };
}

function withTransaction<T>(database: DatabaseSync, operation: () => T): T {
  try {
    database.exec("BEGIN IMMEDIATE");
    const result = operation();
    database.exec("COMMIT");
    return result;
  } catch (error) {
    if (database.isTransaction) database.exec("ROLLBACK");
    throw error;
  }
}

export function createSqliteSchedulerRepository(database: DatabaseSync, options: SqliteSchedulerRepositoryOptions = {}): SchedulerStateRepositoryPort {
  const now = options.now ?? (() => new Date().toISOString());
  return Object.freeze({
    async getOriginRateLimit(input: Parameters<SchedulerStateRepositoryPort["getOriginRateLimit"]>[0]) {
      const projectId = identifier(input.projectId, "projectId");
      const runId = identifier(input.runId, "runId");
      const origin = canonicalOrigin(input.origin);
      const row = database.prepare("SELECT * FROM origin_rate_limits WHERE project_id = ? AND run_id = ? AND origin = ?").get(projectId, runId, origin) as Row | undefined;
      return row === undefined ? null : rowToState(row);
    },

    async saveOriginRateLimit(input: Parameters<SchedulerStateRepositoryPort["saveOriginRateLimit"]>[0]) {
      const projectId = identifier(input.projectId, "projectId");
      const runId = identifier(input.runId, "runId");
      const origin = canonicalOrigin(input.origin);
      const updatedAt = timestamp(input.updatedAt, "updatedAt");
      const cooldownUntil = input.cooldownUntil === null ? null : timestamp(input.cooldownUntil, "cooldownUntil");
      if (input.lastStatus !== null && (!Number.isInteger(input.lastStatus) || input.lastStatus < 100 || input.lastStatus > 599)) throw new Error("lastStatus is invalid");
      return withTransaction(database, () => {
        database.prepare(`
          INSERT INTO origin_rate_limits (project_id, run_id, origin, cooldown_until, last_status, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(project_id, run_id, origin) DO UPDATE SET cooldown_until = excluded.cooldown_until, last_status = excluded.last_status, updated_at = excluded.updated_at
        `).run(projectId, runId, origin, cooldownUntil, input.lastStatus, updatedAt);
        return rowToState(database.prepare("SELECT * FROM origin_rate_limits WHERE project_id = ? AND run_id = ? AND origin = ?").get(projectId, runId, origin) as Row);
      });
    },

    async listOriginRateLimits(input: Parameters<SchedulerStateRepositoryPort["listOriginRateLimits"]>[0]) {
      const projectId = identifier(input.projectId, "projectId");
      const runId = identifier(input.runId, "runId");
      const rows = database.prepare("SELECT * FROM origin_rate_limits WHERE project_id = ? AND run_id = ? ORDER BY origin ASC").all(projectId, runId) as unknown as Row[];
      return rows.map(rowToState);
    },
  });
}

export function originRateLimitStateFromSnapshot(input: { readonly projectId: string; readonly runId: string; readonly origin: string; readonly cooldownUntilMs: number | null; readonly lastStatus: number | null; readonly now?: string }): OriginRateLimitState {
  if (input.cooldownUntilMs !== null && (!Number.isSafeInteger(input.cooldownUntilMs) || input.cooldownUntilMs < 0)) throw new Error("cooldownUntilMs is invalid");
  if (input.lastStatus !== null && (!Number.isInteger(input.lastStatus) || input.lastStatus < 100 || input.lastStatus > 599)) throw new Error("lastStatus is invalid");
  return {
    projectId: input.projectId,
    runId: input.runId,
    origin: canonicalOrigin(input.origin),
    cooldownUntil: input.cooldownUntilMs === null ? null : new Date(input.cooldownUntilMs).toISOString(),
    lastStatus: input.lastStatus,
    updatedAt: timestamp(input.now ?? new Date().toISOString(), "now"),
  };
}
