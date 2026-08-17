import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  API_CAPTURE_CONTRACT_VERSION,
  ProjectOperationError,
  REPLAY_MATCH_CONTRACT_VERSION,
  canonicalReplayRequestIdentity,
  safeReplayUrl,
  sanitizeReplayResponseHeaders,
  type ReplayCaptureInput,
  type ReplayLookupResult,
  type ReplayRequestIdentityInput,
  type ReplayRuntimeEvent,
  type ReplaySnapshotDescriptor,
  type ReplaySnapshotRepositoryPort,
} from "@offline-web-archive/archive-core";
import { atomicWriteFile, pathExists, resolveProjectRelativePath } from "./atomic.js";

const MAX_REPLAY_BODY_BYTES = 8 * 1024 * 1024;
const BODY_ROOT = "api/responses";

interface ReplaySnapshotRow {
  snapshot_id: string;
  project_id: string;
  run_id: string;
  project_revision_id: string;
  capture_version: number;
  method: string;
  original_url: string;
  normalized_url: string;
  request_headers_json: string;
  request_identity_key: string;
  status: number;
  content_type: string;
  response_headers_json: string;
  body_sha256: string;
  body_bytes: number;
  body_relative_path: string;
  captured_at: string;
  page_id: string | null;
  worker_id: string | null;
  state: "complete" | "rejected" | "incomplete";
}

function sha256(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeText(value: string, maximum: number): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, maximum);
}

function parseHeaders(value: string): Readonly<Record<string, string>> {
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new ProjectOperationError("PROJECT_DATABASE_INVALID", "Replay header metadata is not valid JSON"); }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new ProjectOperationError("PROJECT_DATABASE_INVALID", "Replay header metadata is malformed");
  const result: Record<string, string> = {};
  for (const [name, item] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof item !== "string" || name.length > 128 || item.length > 4_096) throw new ProjectOperationError("PROJECT_DATABASE_INVALID", "Replay header metadata is malformed");
    result[name] = item;
  }
  return Object.freeze(result);
}

function snapshotFromRow(row: ReplaySnapshotRow): ReplaySnapshotDescriptor {
  if (row.capture_version !== API_CAPTURE_CONTRACT_VERSION || row.method !== "GET" || row.state !== "complete") throw new ProjectOperationError("PROJECT_DATABASE_INVALID", "Replay snapshot state is not replayable");
  const requestHeaders = parseHeaders(row.request_headers_json);
  const responseHeaders = sanitizeReplayResponseHeaders(parseHeaders(row.response_headers_json));
  const identity = canonicalReplayRequestIdentity({
    projectId: row.project_id,
    runId: row.run_id,
    projectRevisionId: row.project_revision_id,
    method: "GET",
    url: row.normalized_url,
    headers: requestHeaders,
  });
  if (identity.key !== row.request_identity_key || identity.contractVersion !== REPLAY_MATCH_CONTRACT_VERSION) throw new ProjectOperationError("PROJECT_DATABASE_INVALID", "Replay snapshot identity is inconsistent");
  return Object.freeze({
    snapshotId: row.snapshot_id,
    captureVersion: API_CAPTURE_CONTRACT_VERSION,
    identity,
    originalUrl: safeReplayUrl(row.original_url),
    status: row.status,
    contentType: row.content_type,
    responseHeaders,
    bodySha256: row.body_sha256,
    bodyBytes: row.body_bytes,
    bodyRelativePath: row.body_relative_path,
    capturedAt: row.captured_at,
    pageId: row.page_id,
    workerId: row.worker_id,
    state: row.state,
  });
}

function mapRuntimeEventRow(row: Record<string, unknown>): ReplayRuntimeEvent {
  return Object.freeze({
    eventType: String(row["event_type"]) as ReplayRuntimeEvent["eventType"],
    projectId: String(row["project_id"]),
    runId: String(row["run_id"]),
    projectRevisionId: String(row["project_revision_id"]),
    method: String(row["method"]),
    safeUrl: String(row["safe_url"]),
    normalizedIdentity: row["normalized_identity"] === null ? null : String(row["normalized_identity"]),
    resourceType: row["resource_type"] === null ? null : String(row["resource_type"]),
    initiatingPage: row["initiating_page"] === null ? null : String(row["initiating_page"]),
    reason: String(row["reason"]),
    matchState: String(row["match_state"]),
    strictOffline: Number(row["strict_offline"]) === 1,
    occurredAt: String(row["occurred_at"]),
  });
}

export interface SqliteReplayRepositoryOptions {
  readonly projectRoot: string;
  readonly now?: () => string;
  readonly id?: () => string;
}

export function createSqliteReplayRepository(database: DatabaseSync, options: SqliteReplayRepositoryOptions): ReplaySnapshotRepositoryPort {
  const projectRoot = path.resolve(options.projectRoot);
  const now = options.now ?? (() => new Date().toISOString());
  const id = options.id ?? (() => randomUUID());

  const assertReplayScope = (projectId: string, runId: string, projectRevisionId: string): void => {
    const row = database.prepare(`
      SELECT pm.project_id
      FROM project_metadata pm
      JOIN runs r ON r.project_id = pm.project_id AND r.run_id = ? AND r.revision_id = ?
      JOIN project_revisions pr ON pr.project_id = pm.project_id AND pr.revision_id = r.revision_id
      WHERE pm.project_id = ?
    `).get(runId, projectRevisionId, projectId) as { project_id?: string } | undefined;
    if (row?.project_id !== projectId) throw new ProjectOperationError("PROJECT_VALIDATION_FAILED", "Replay Project/Run/Revision scope is not owned by the active Project");
  };

  const readValidatedBody = async (snapshot: ReplaySnapshotDescriptor): Promise<Uint8Array> => {
    if (snapshot.identity.projectId.length === 0 || snapshot.bodyBytes < 0 || snapshot.bodyBytes > MAX_REPLAY_BODY_BYTES || !/^[a-f0-9]{64}$/.test(snapshot.bodySha256) || snapshot.bodyRelativePath !== `${BODY_ROOT}/${snapshot.bodySha256}.bin`) throw new ProjectOperationError("PROJECT_DATABASE_INVALID", "Replay body metadata is invalid");
    const target = await resolveProjectRelativePath(projectRoot, snapshot.bodyRelativePath);
    const bytes = new Uint8Array(await readFile(target));
    if (bytes.byteLength !== snapshot.bodyBytes || sha256(bytes) !== snapshot.bodySha256) throw new ProjectOperationError("PROJECT_DATABASE_INVALID", "Replay response integrity verification failed");
    return bytes;
  };

  const repository: ReplaySnapshotRepositoryPort = {
    async capture(input: ReplayCaptureInput): Promise<ReplaySnapshotDescriptor> {
      if (!(input.body instanceof Uint8Array) || input.body.byteLength > MAX_REPLAY_BODY_BYTES) throw new ProjectOperationError("PROJECT_IMPORT_LIMIT_EXCEEDED", "Replay response exceeds the configured body limit");
      if (input.request.method !== "GET") throw new ProjectOperationError("PROJECT_DATABASE_INVALID", "Only GET responses may become replay snapshots");
      assertReplayScope(input.projectId, input.runId, input.projectRevisionId);
      const identityInput: ReplayRequestIdentityInput = {
        projectId: input.projectId,
        runId: input.runId,
        projectRevisionId: input.projectRevisionId,
        method: "GET",
        url: input.request.url,
        ...(input.request.headers === undefined ? {} : { headers: input.request.headers }),
        ...(input.queryPolicy === undefined ? {} : { queryPolicy: input.queryPolicy }),
      };
      const identity = canonicalReplayRequestIdentity(identityInput);
      const bodySha256 = sha256(input.body);
      const responseHeaders = sanitizeReplayResponseHeaders(input.response.headers);
      const contentType = safeText(input.response.contentType.split(";", 1)[0]!.trim().toLowerCase(), 512);
      if (contentType.length === 0 || input.response.status < 100 || input.response.status > 599) throw new ProjectOperationError("PROJECT_DATABASE_INVALID", "Replay response metadata is invalid");
      const bodyRelativePath = `${BODY_ROOT}/${bodySha256}.bin`;
      const target = await resolveProjectRelativePath(projectRoot, bodyRelativePath);
      if (await pathExists(target)) {
        const existing = new Uint8Array(await readFile(target));
        if (existing.byteLength !== input.body.byteLength || sha256(existing) !== bodySha256) throw new ProjectOperationError("PROJECT_DATABASE_INVALID", "A replay body path is occupied by different bytes");
      } else {
        await atomicWriteFile(target, input.body, { overwrite: false });
      }
      const snapshotId = id();
      const capturedAt = safeText(input.capturedAt, 64);
      let inTransaction = false;
      try {
        database.exec("BEGIN IMMEDIATE");
        inTransaction = true;
        database.prepare(`
          INSERT OR IGNORE INTO replay_snapshots
            (snapshot_id, project_id, run_id, project_revision_id, capture_version, method,
             original_url, normalized_url, request_headers_json, request_identity_key, status,
             content_type, response_headers_json, body_sha256, body_bytes, body_relative_path,
             captured_at, page_id, worker_id, state)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'complete')
        `).run(
          snapshotId,
          input.projectId,
          input.runId,
          input.projectRevisionId,
          API_CAPTURE_CONTRACT_VERSION,
          "GET",
          safeReplayUrl(input.originalUrl),
          identity.normalizedUrl,
          JSON.stringify(identity.selectedHeaders),
          identity.key,
          input.response.status,
          contentType,
          JSON.stringify(responseHeaders),
          bodySha256,
          input.body.byteLength,
          bodyRelativePath,
          capturedAt,
          input.pageId ?? null,
          input.workerId ?? null,
        );
        database.exec("COMMIT");
        inTransaction = false;
      } catch (error) {
        if (inTransaction) database.exec("ROLLBACK");
        throw error;
      }
      const row = database.prepare(`
        SELECT snapshot_id, project_id, run_id, project_revision_id, capture_version, method,
               original_url, normalized_url, request_headers_json, request_identity_key, status,
               content_type, response_headers_json, body_sha256, body_bytes, body_relative_path,
               captured_at, page_id, worker_id, state
        FROM replay_snapshots
        WHERE project_id = ? AND run_id = ? AND project_revision_id = ? AND request_identity_key = ? AND body_sha256 = ?
        ORDER BY snapshot_id
        LIMIT 1
      `).get(input.projectId, input.runId, input.projectRevisionId, identity.key, bodySha256) as ReplaySnapshotRow | undefined;
      if (row === undefined) throw new ProjectOperationError("PROJECT_DATABASE_INVALID", "Replay snapshot was not committed");
      return snapshotFromRow(row);
    },

    async lookup(input: ReplayRequestIdentityInput): Promise<ReplayLookupResult> {
      let identity;
      try { identity = canonicalReplayRequestIdentity(input); }
      catch (error) {
        const message = error instanceof Error ? error.message : "Replay request identity is invalid";
        return { state: "miss", reason: /sensitive query/i.test(message) ? "sensitive-request" : "unsupported-protocol" };
      }
      const rows = database.prepare(`
        SELECT snapshot_id, project_id, run_id, project_revision_id, capture_version, method,
               original_url, normalized_url, request_headers_json, request_identity_key, status,
               content_type, response_headers_json, body_sha256, body_bytes, body_relative_path,
               captured_at, page_id, worker_id, state
        FROM replay_snapshots
        WHERE project_id = ? AND run_id = ? AND project_revision_id = ? AND request_identity_key = ? AND state = 'complete'
        ORDER BY captured_at ASC, snapshot_id ASC
      `).all(identity.projectId, identity.runId, identity.projectRevisionId, identity.key) as unknown as ReplaySnapshotRow[];
      if (rows.length === 0) return { state: "miss", reason: "no-capture" };
      let snapshots: ReplaySnapshotDescriptor[];
      try { snapshots = rows.map(snapshotFromRow); }
      catch { return { state: "miss", reason: "integrity-failure" }; }
      const distinctBodies = new Set(snapshots.map((snapshot) => snapshot.bodySha256));
      if (distinctBodies.size > 1) return { state: "ambiguous", candidates: snapshots };
      return { state: "match", snapshot: snapshots[0]! };
    },

    async readBody(snapshot: ReplaySnapshotDescriptor): Promise<Uint8Array> {
      assertReplayScope(snapshot.identity.projectId, snapshot.identity.runId, snapshot.identity.projectRevisionId);
      const row = database.prepare(`
        SELECT project_id, run_id, project_revision_id, request_identity_key, body_sha256, body_bytes,
               body_relative_path, capture_version, method, state
        FROM replay_snapshots WHERE snapshot_id = ?
      `).get(snapshot.snapshotId) as {
        project_id?: string; run_id?: string; project_revision_id?: string; request_identity_key?: string;
        body_sha256?: string; body_bytes?: number; body_relative_path?: string; capture_version?: number;
        method?: string; state?: string;
      } | undefined;
      if (row === undefined || row.project_id !== snapshot.identity.projectId || row.run_id !== snapshot.identity.runId || row.project_revision_id !== snapshot.identity.projectRevisionId || row.request_identity_key !== snapshot.identity.key || row.body_sha256 !== snapshot.bodySha256 || row.body_bytes !== snapshot.bodyBytes || row.body_relative_path !== snapshot.bodyRelativePath || row.capture_version !== API_CAPTURE_CONTRACT_VERSION || row.method !== "GET" || row.state !== "complete") throw new ProjectOperationError("PROJECT_DATABASE_INVALID", "Replay snapshot ownership or state is invalid");
      return readValidatedBody(snapshot);
    },

    async recordRuntimeEvent(event: ReplayRuntimeEvent): Promise<void> {
      assertReplayScope(event.projectId, event.runId, event.projectRevisionId);
      database.prepare(`
        INSERT INTO replay_runtime_events
          (event_id, project_id, run_id, project_revision_id, event_type, method, safe_url,
           normalized_identity, resource_type, initiating_page, reason, match_state, strict_offline, occurred_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id(),
        event.projectId,
        event.runId,
        event.projectRevisionId,
        safeText(event.eventType, 80),
        safeText(event.method, 16),
        safeText(safeReplayUrl(event.safeUrl), 2_048),
        event.normalizedIdentity === null ? null : safeText(event.normalizedIdentity, 32_768),
        event.resourceType === null ? null : safeText(event.resourceType, 80),
        event.initiatingPage === null ? null : safeText(event.initiatingPage, 2_048),
        safeText(event.reason, 160),
        safeText(event.matchState, 80),
        event.strictOffline ? 1 : 0,
        safeText(event.occurredAt || now(), 64),
      );
    },

    async listRuntimeEvents(input): Promise<readonly ReplayRuntimeEvent[]> {
      if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 10_000) throw new ProjectOperationError("PROJECT_DATABASE_INVALID", "Replay event limit is invalid");
      assertReplayScope(input.projectId, input.runId, input.projectRevisionId);
      const rows = database.prepare(`
        SELECT event_type, project_id, run_id, project_revision_id, method, safe_url,
               normalized_identity, resource_type, initiating_page, reason, match_state,
               strict_offline, occurred_at
        FROM replay_runtime_events
        WHERE project_id = ? AND run_id = ? AND project_revision_id = ?
        ORDER BY occurred_at ASC, event_id ASC
        LIMIT ?
      `).all(input.projectId, input.runId, input.projectRevisionId, input.limit) as unknown as Record<string, unknown>[];
      return rows.map(mapRuntimeEventRow);
    },
  };
  return Object.freeze(repository);
}
