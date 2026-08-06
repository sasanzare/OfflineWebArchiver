import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  createDisabledInteractionProfile,
  InteractionOperationError,
  parseInteractionProfile,
  redactInteractionTrace,
  type InteractionProfile,
  type InteractionProfileRepositoryPort,
  type InteractionTrace,
  type InteractionTraceRepositoryPort,
} from "@offline-web-archive/archive-core";
import { RecoveryOperationError } from "@offline-web-archive/archive-core";

type Row = Record<string, string | number | null>;

export interface SqliteInteractionRepositoryOptions {
  now?: () => string;
}

function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([key, child]) => [key, ordered(child)]));
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(ordered(value));
}

function hash(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function rowToProfile(row: Row): InteractionProfile {
  return parseInteractionProfile(JSON.parse(String(row["canonical_json"])));
}

function rowToTrace(row: Row): InteractionTrace {
  return JSON.parse(String(row["canonical_json"])) as InteractionTrace;
}

export type SqliteInteractionRepository = InteractionProfileRepositoryPort & InteractionTraceRepositoryPort;

export function createSqliteInteractionRepository(database: DatabaseSync, options: SqliteInteractionRepositoryOptions = {}): SqliteInteractionRepository {
  const now = options.now ?? (() => new Date().toISOString());
  const transaction = <T>(operation: () => T): T => {
    try {
      database.exec("BEGIN IMMEDIATE");
      const result = operation();
      database.exec("COMMIT");
      return result;
    } catch (error) {
      if (database.isTransaction) database.exec("ROLLBACK");
      if (error instanceof InteractionOperationError || error instanceof RecoveryOperationError) throw error;
      throw new InteractionOperationError("INTERACTION_PERSISTENCE_FAILED", "The Interaction persistence transaction failed safely", true);
    }
  };

  const assertProject = (projectId: string): void => {
    const row = database.prepare("SELECT project_id FROM project_metadata WHERE singleton_id = 1 AND project_id = ?").get(projectId);
    if (row === undefined) throw new InteractionOperationError("INTERACTION_PERSISTENCE_FAILED", "The Interaction Project identity is invalid");
  };

  const assertOwnership = (input: { projectId: string; runId: string; jobId: string; leaseToken: string; fencingGeneration: number; ownerId: string }): void => {
    assertProject(input.projectId);
    const job = database.prepare("SELECT fencing_generation FROM page_jobs WHERE project_id = ? AND run_id = ? AND job_id = ?").get(input.projectId, input.runId, input.jobId) as Row | undefined;
    if (job === undefined) throw new InteractionOperationError("INTERACTION_PERSISTENCE_FAILED", "The Interaction Page Job identity is invalid");
    if (Number(job["fencing_generation"]) !== input.fencingGeneration) throw new RecoveryOperationError("FENCING_GENERATION_STALE", "A newer owner fenced the Interaction Trace write");
    const lease = database.prepare("SELECT lease_token_hash, owner_id, fencing_generation, expires_at FROM job_leases WHERE project_id = ? AND run_id = ? AND job_id = ? AND status = 'active'").get(input.projectId, input.runId, input.jobId) as Row | undefined;
    if (lease === undefined) throw new RecoveryOperationError("LEASE_NOT_FOUND", "The Interaction Page Job has no active Lease");
    if (String(lease["owner_id"]) !== input.ownerId) throw new RecoveryOperationError("LEASE_OWNER_MISMATCH", "The Interaction Lease belongs to another owner");
    if (Number(lease["fencing_generation"]) !== input.fencingGeneration) throw new RecoveryOperationError("FENCING_GENERATION_STALE", "The Interaction Lease generation is stale");
    if (hash(input.leaseToken) !== String(lease["lease_token_hash"])) throw new RecoveryOperationError("LEASE_TOKEN_INVALID", "The Interaction Lease Token is invalid");
    if (String(lease["expires_at"]) <= now()) throw new RecoveryOperationError("LEASE_EXPIRED", "The Interaction Lease expired before the Trace write");
  };

  const repository: SqliteInteractionRepository = {
    async getInteractionProfile(input) {
      assertProject(input.projectId);
      const row = database.prepare("SELECT * FROM interaction_profiles WHERE project_id = ?").get(input.projectId) as Row | undefined;
      return row === undefined ? createDisabledInteractionProfile({ projectId: input.projectId }) : rowToProfile(row);
    },
    async saveInteractionProfile(input) {
      assertProject(input.projectId);
      const profile = parseInteractionProfile(input.profile);
      if (profile.projectId !== null && profile.projectId !== input.projectId) throw new InteractionOperationError("INTERACTION_PROFILE_INVALID", "The Interaction Profile belongs to another Project");
      const serialized = canonicalJson(profile);
      if (serialized.length > 65_536) throw new InteractionOperationError("INTERACTION_PROFILE_INVALID", "The Interaction Profile exceeds the persistence bound");
      const timestamp = now();
      return transaction(() => {
        const existing = database.prepare("SELECT created_at, sequence FROM interaction_profiles WHERE project_id = ?").get(input.projectId) as Row | undefined;
        const sequence = Number(existing?.["sequence"] ?? 0) + 1;
        database.prepare(`
          INSERT INTO interaction_profiles (profile_id, project_id, profile_revision_id, sequence, schema_version, canonical_json, profile_hash, created_at, updated_at)
          VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)
          ON CONFLICT(project_id) DO UPDATE SET profile_id = excluded.profile_id, profile_revision_id = excluded.profile_revision_id, sequence = excluded.sequence,
            canonical_json = excluded.canonical_json, profile_hash = excluded.profile_hash, updated_at = excluded.updated_at
        `).run(profile.profileId, input.projectId, profile.profileRevisionId, sequence, serialized, hash(serialized), existing?.["created_at"] === undefined ? timestamp : String(existing["created_at"]), timestamp);
        return profile;
      });
    },
    async saveInteractionTrace(input) {
      assertOwnership(input);
      const safeTrace = redactInteractionTrace(input.trace) as InteractionTrace;
      const serialized = canonicalJson(safeTrace);
      if (serialized.length > 262_144) throw new InteractionOperationError("INTERACTION_TRACE_LIMIT", "The Interaction Trace exceeds the persistence bound");
      return transaction(() => {
        const existing = database.prepare("SELECT * FROM interaction_traces WHERE trace_id = ?").get(input.trace.traceId) as Row | undefined;
        if (existing !== undefined) {
          const stored = rowToTrace(existing);
          if (canonicalJson(stored) !== serialized) throw new InteractionOperationError("INTERACTION_PERSISTENCE_FAILED", "The Interaction Trace identifier was reused with different content");
          return stored;
        }
        database.prepare(`
          INSERT INTO interaction_traces
            (trace_id, project_id, run_id, job_id, profile_id, profile_revision_id, fencing_generation, owner_id, status, trace_schema_version, canonical_json, created_at, completed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
        `).run(input.trace.traceId, input.projectId, input.runId, input.jobId, input.trace.profileId, input.trace.profileRevisionId, input.fencingGeneration, input.ownerId, input.trace.status, serialized, input.trace.createdAt, input.trace.completedAt);
        return safeTrace;
      });
    },
    async getInteractionTrace(input) {
      const row = database.prepare("SELECT * FROM interaction_traces WHERE project_id = ? AND run_id = ? AND job_id = ? AND trace_id = ?").get(input.projectId, input.runId, input.jobId, input.traceId) as Row | undefined;
      if (row === undefined) throw new InteractionOperationError("INTERACTION_PERSISTENCE_FAILED", "The Interaction Trace was not found");
      return rowToTrace(row);
    },
    async listInteractionTraces(input) {
      if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 200) throw new InteractionOperationError("INTERACTION_TRACE_LIMIT", "The Interaction Trace list limit is invalid");
      const rows = database.prepare("SELECT * FROM interaction_traces WHERE project_id = ? AND run_id = ? AND job_id = ? ORDER BY created_at DESC, trace_id DESC LIMIT ?").all(input.projectId, input.runId, input.jobId, input.limit) as unknown as Row[];
      return rows.map(rowToTrace);
    },
  };
  return Object.freeze(repository);
}
