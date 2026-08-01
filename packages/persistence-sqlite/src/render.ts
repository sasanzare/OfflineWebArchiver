import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import {
  QueueOperationError,
  RecoveryOperationError,
  RenderOperationError,
  type BrowserEvidenceSnapshot,
  type RenderEvent,
  type RenderFailure,
  type RenderRepositoryPort,
  type RenderResult,
  type RenderStage,
  type RenderStatus,
} from "@offline-web-archive/archive-core";
import { atomicWriteFile } from "./atomic.js";

type Row = Record<string, unknown>;

export interface SqliteRenderRepositoryOptions {
  projectRoot: string;
  now?: () => string;
  id?: () => string;
  fault?: "after-html-write" | "after-database-commit";
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeJson(value: Readonly<Record<string, unknown>>): string {
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized, "utf8") > 131_072) throw new RenderOperationError("RENDER_COMMIT_FAILED", "Render evidence exceeds the approved persistence limit");
  if (/(?:cookie|authorization|password|token|secret|set-cookie)"?\s*:/i.test(serialized)) {
    throw new RenderOperationError("RENDER_COMMIT_FAILED", "Render metadata contains a prohibited sensitive key");
  }
  return serialized;
}

function parseEvidence(value: string): BrowserEvidenceSnapshot {
  const parsed = JSON.parse(value) as { evidence?: BrowserEvidenceSnapshot };
  return parsed.evidence ?? { consoleEntries: [], pageErrors: [], failedRequests: [], redirects: [], blockedRequests: 0, evidenceTruncated: false };
}

function rowToEvent(row: Row): RenderEvent {
  return {
    renderEventId: String(row["render_event_id"]),
    jobId: String(row["job_id"]),
    attemptId: String(row["attempt_id"]),
    leaseId: String(row["lease_id"]),
    fencingGeneration: Number(row["fencing_generation"]),
    stage: String(row["stage"]) as RenderStage,
    eventType: String(row["event_type"]),
    safeMetadata: JSON.parse(String(row["safe_metadata_json"])) as Readonly<Record<string, string | number | boolean | null>>,
    occurredAt: String(row["occurred_at"]),
  };
}

function rowToResult(row: Row): RenderResult {
  return {
    renderResultId: String(row["render_result_id"]),
    renderResultVersion: 1,
    jobId: String(row["job_id"]),
    attemptId: String(row["attempt_id"]),
    projectId: String(row["project_id"]),
    runId: String(row["run_id"]),
    requestedUrlSafe: String(row["requested_url_safe"]),
    finalUrlSafe: String(row["final_url_safe"]),
    httpStatus: row["http_status"] === null ? null : Number(row["http_status"]),
    contentType: row["content_type"] === null ? null : String(row["content_type"]),
    pageTitleSafe: String(row["page_title_safe"]),
    resultStatus: String(row["result_status"]) as RenderResult["resultStatus"],
    qualityClassification: String(row["quality_classification"]) as RenderResult["qualityClassification"],
    navigationStartedAt: String(row["navigation_started_at"]),
    stabilityReachedAt: String(row["stability_reached_at"]),
    extractionCompletedAt: String(row["extraction_completed_at"]),
    renderCompletedAt: String(row["render_completed_at"]),
    navigationDurationMs: Number(row["navigation_duration_ms"]),
    stabilityDurationMs: Number(row["stability_duration_ms"]),
    totalDurationMs: Number(row["total_duration_ms"]),
    browserVersion: String(row["browser_version"]),
    playwrightVersion: String(row["playwright_version"]),
    renderEngineVersion: Number(row["render_engine_version"]),
    contextProfileVersion: Number(row["context_profile_version"]),
    htmlArtifact: { relativePath: String(row["html_relative_path"]), byteLength: Number(row["html_byte_length"]), sha256: String(row["html_sha256"]) },
    screenshotArtifact: row["screenshot_relative_path"] === null ? null : { relativePath: String(row["screenshot_relative_path"]), byteLength: Number(row["screenshot_byte_length"]), sha256: String(row["screenshot_sha256"]) },
    evidence: parseEvidence(String(row["safe_summary_json"])),
    createdAt: String(row["created_at"]),
  };
}

function rowToFailure(row: Row): RenderFailure {
  return {
    renderFailureId: String(row["render_failure_id"]),
    jobId: String(row["job_id"]),
    attemptId: String(row["attempt_id"]),
    failureCode: String(row["failure_code"]) as RenderFailure["failureCode"],
    failureCategory: String(row["failure_category"]) as RenderFailure["failureCategory"],
    retryable: Number(row["retryable"]) === 1,
    safeMessage: String(row["safe_message"]),
    occurredAt: String(row["occurred_at"]),
  };
}

export function createSqliteRenderRepository(database: DatabaseSync, options: SqliteRenderRepositoryOptions): RenderRepositoryPort {
  const projectRoot = path.resolve(options.projectRoot);
  const now = options.now ?? (() => new Date().toISOString());
  const id = options.id ?? randomUUID;

  const transaction = <T>(operation: () => T): T => {
    try {
      database.exec("BEGIN IMMEDIATE");
      const result = operation();
      database.exec("COMMIT");
      return result;
    } catch (error) {
      if (database.isTransaction) database.exec("ROLLBACK");
      if (error instanceof RenderOperationError || error instanceof QueueOperationError || error instanceof RecoveryOperationError) throw error;
      const detail = error instanceof Error
        ? error.message.replace(/[A-Za-z]:\\[^\r\n]+/g, "[local-path]").slice(0, 240)
        : "unknown database error";
      throw new RenderOperationError("RENDER_COMMIT_FAILED", `The Render persistence transaction failed safely: ${detail}`, true);
    }
  };

  const assertOwnership = (input: { projectId: string; runId: string; jobId: string; leaseToken: string; fencingGeneration: number; ownerId: string }): { job: Row; lease: Row; attempt: Row } => {
    const job = database.prepare("SELECT * FROM page_jobs WHERE project_id = ? AND run_id = ? AND job_id = ?").get(input.projectId, input.runId, input.jobId) as Row | undefined;
    if (job === undefined) throw new QueueOperationError("QUEUE_JOB_NOT_FOUND", "The Render Page Job was not found");
    if (String(job["state"]) !== "processing" || job["recovery_state"] !== null) throw new QueueOperationError("QUEUE_JOB_STATE_CONFLICT", "The Render Page Job is not actively processing");
    if (Number(job["fencing_generation"]) !== input.fencingGeneration) throw new RecoveryOperationError("FENCING_GENERATION_STALE", "A newer Render owner fenced this write");
    const lease = database.prepare("SELECT * FROM job_leases WHERE project_id = ? AND run_id = ? AND job_id = ? AND status = 'active'").get(input.projectId, input.runId, input.jobId) as Row | undefined;
    if (lease === undefined) throw new RecoveryOperationError("LEASE_NOT_FOUND", "The Render Page Job has no active Lease");
    if (String(lease["owner_id"]) !== input.ownerId) throw new RecoveryOperationError("LEASE_OWNER_MISMATCH", "The Render Lease belongs to another owner");
    if (Number(lease["fencing_generation"]) !== input.fencingGeneration) throw new RecoveryOperationError("FENCING_GENERATION_STALE", "The Render Lease generation is stale");
    if (sha256(input.leaseToken) !== String(lease["lease_token_hash"])) throw new RecoveryOperationError("LEASE_TOKEN_INVALID", "The Render Lease Token is invalid");
    if (String(lease["expires_at"]) <= now()) throw new RecoveryOperationError("LEASE_EXPIRED", "The Render Lease expired before the write");
    const attempt = database.prepare("SELECT * FROM job_attempts WHERE job_id = ? AND attempt_number = ? AND outcome = 'processing'").get(input.jobId, Number(job["attempt_count"])) as Row | undefined;
    if (attempt === undefined) throw new RenderOperationError("RENDER_COMMIT_FAILED", "The active Render attempt ledger is missing");
    return { job, lease, attempt };
  };

  const insertEvent = (ownership: { job: Row; lease: Row; attempt: Row }, stage: RenderStage, eventType: string, safeMetadata: Readonly<Record<string, string | number | boolean | null>>, occurredAt: string): RenderEvent => {
    const renderEventId = id();
    database.prepare(`
      INSERT INTO render_events (render_event_id, job_id, attempt_id, lease_id, fencing_generation, stage, event_type, safe_metadata_json, occurred_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(renderEventId, String(ownership.job["job_id"]), String(ownership.attempt["attempt_id"]), String(ownership.lease["lease_id"]), Number(ownership.job["fencing_generation"]), stage, eventType, safeJson(safeMetadata), occurredAt);
    return rowToEvent(database.prepare("SELECT * FROM render_events WHERE render_event_id = ?").get(renderEventId) as Row);
  };

  const repository: RenderRepositoryPort = {
    async recordRenderEvent(input) {
      return transaction(() => insertEvent(assertOwnership(input), input.stage, input.eventType, input.safeMetadata ?? {}, input.occurredAt));
    },

    async commitRenderResult(input) {
      const htmlRelativePath = `pages/${input.jobId}/rendered.html`;
      const screenshotRelativePath = input.screenshot === null ? null : `pages/${input.jobId}/screenshot.png`;
      const htmlBytes = new TextEncoder().encode(input.html);
      const htmlHash = sha256(htmlBytes);
      await atomicWriteFile(path.join(projectRoot, ...htmlRelativePath.split("/")), htmlBytes, { overwrite: true });
      if (screenshotRelativePath !== null && input.screenshot !== null) {
        await atomicWriteFile(path.join(projectRoot, ...screenshotRelativePath.split("/")), input.screenshot, { overwrite: true });
      }
      if (options.fault === "after-html-write") throw new RenderOperationError("RENDER_COMMIT_FAILED", "Injected failure after Render artifact write", true);
      const result = transaction(() => {
        const replay = database.prepare("SELECT * FROM render_results WHERE project_id = ? AND operation_id = ?").get(input.projectId, input.operationId) as Row | undefined;
        if (replay !== undefined) {
          if (String(replay["job_id"]) !== input.jobId) throw new RenderOperationError("RENDER_COMMIT_FAILED", "The Render operation ID was already used for another Job");
          return rowToResult(replay);
        }
        const ownership = assertOwnership(input);
        const renderResultId = id();
        const createdAt = now();
        const screenshotHash = input.screenshot === null ? null : sha256(input.screenshot);
        const summaryJson = safeJson({ evidence: input.result.evidence });
        database.prepare(`
          INSERT INTO render_results (
            render_result_id, render_result_version, job_id, attempt_id, lease_id, fencing_generation, project_id, run_id,
            requested_url_safe, final_url_safe, http_status, content_type, page_title_safe, result_status, quality_classification,
            navigation_started_at, stability_reached_at, extraction_completed_at, render_completed_at,
            navigation_duration_ms, stability_duration_ms, total_duration_ms, browser_version, playwright_version,
            render_engine_version, context_profile_version, html_relative_path, html_byte_length, html_sha256,
            screenshot_relative_path, screenshot_byte_length, screenshot_sha256, safe_summary_json, operation_id, created_at
          ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          renderResultId, input.jobId, String(ownership.attempt["attempt_id"]), String(ownership.lease["lease_id"]), input.fencingGeneration, input.projectId, input.runId,
          input.result.requestedUrlSafe, input.result.finalUrlSafe, input.result.httpStatus, input.result.contentType, input.result.pageTitleSafe,
          input.result.resultStatus, input.result.qualityClassification, input.result.navigationStartedAt, input.result.stabilityReachedAt,
          input.result.extractionCompletedAt, input.result.renderCompletedAt, input.result.navigationDurationMs, input.result.stabilityDurationMs,
          input.result.totalDurationMs, input.result.browserVersion, input.result.playwrightVersion, input.result.renderEngineVersion,
          input.result.contextProfileVersion, htmlRelativePath, htmlBytes.byteLength, htmlHash, screenshotRelativePath,
          input.screenshot?.byteLength ?? null, screenshotHash, summaryJson, input.operationId, createdAt,
        );
        database.prepare(`INSERT INTO completed_outputs (descriptor_id, job_id, relative_path, byte_length, sha256, verification_policy, verification_status) VALUES (?, ?, ?, ?, ?, 'size-and-sha256', 'valid')`)
          .run(id(), input.jobId, htmlRelativePath, htmlBytes.byteLength, htmlHash);
        if (screenshotRelativePath !== null && input.screenshot !== null && screenshotHash !== null) {
          database.prepare(`INSERT INTO completed_outputs (descriptor_id, job_id, relative_path, byte_length, sha256, verification_policy, verification_status) VALUES (?, ?, ?, ?, ?, 'size-and-sha256', 'valid')`)
            .run(id(), input.jobId, screenshotRelativePath, input.screenshot.byteLength, screenshotHash);
        }
        const resultSummary = JSON.stringify({ resultType: "render", statusCode: input.result.httpStatus, contentStored: true, renderResultId, htmlSha256: htmlHash, relativePath: htmlRelativePath });
        database.prepare("UPDATE page_jobs SET state = 'completed', completed_at = ?, result_version = 1, result_summary_json = ?, completion_key = ?, claim_token = NULL, claimed_by = NULL, updated_at = ? WHERE job_id = ? AND state = 'processing' AND fencing_generation = ?")
          .run(input.result.renderCompletedAt, resultSummary, input.operationId, createdAt, input.jobId, input.fencingGeneration);
        database.prepare("UPDATE job_attempts SET finished_at = ?, outcome = 'completed' WHERE attempt_id = ? AND outcome = 'processing'")
          .run(input.result.renderCompletedAt, String(ownership.attempt["attempt_id"]));
        database.prepare(`INSERT INTO job_transitions (transition_id, job_id, from_state, to_state, reason_code, operation_id, correlation_id, occurred_at, safe_metadata_json) VALUES (?, ?, 'processing', 'completed', 'RENDER_RESULT_COMMITTED', ?, ?, ?, ?)`)
          .run(id(), input.jobId, input.operationId, input.operationId, input.result.renderCompletedAt, JSON.stringify({ renderResultId, fencingGeneration: input.fencingGeneration }));
        database.prepare("UPDATE job_leases SET status = 'released', released_at = ?, release_reason = 'RENDER_COMPLETED', last_operation_id = ? WHERE lease_id = ? AND status = 'active'")
          .run(input.result.renderCompletedAt, input.operationId, String(ownership.lease["lease_id"]));
        insertEvent(ownership, "completed", "render.result.committed", { renderResultId, htmlBytes: htmlBytes.byteLength, screenshot: input.screenshot !== null }, input.result.renderCompletedAt);
        return rowToResult(database.prepare("SELECT * FROM render_results WHERE render_result_id = ?").get(renderResultId) as Row);
      });
      if (options.fault === "after-database-commit") throw new RenderOperationError("RENDER_COMMIT_FAILED", "Injected failure after Render database commit", true);
      return result;
    },

    async recordRenderFailure(input) {
      return transaction(() => {
        const ownership = assertOwnership(input);
        const existing = database.prepare("SELECT * FROM render_failures WHERE job_id = ? AND attempt_id = ?").get(input.jobId, String(ownership.attempt["attempt_id"])) as Row | undefined;
        if (existing !== undefined) return rowToFailure(existing);
        const failureId = id();
        database.prepare(`INSERT INTO render_failures (render_failure_id, job_id, attempt_id, lease_id, fencing_generation, failure_code, failure_category, retryable, safe_message, safe_metadata_json, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?)`)
          .run(failureId, input.jobId, String(ownership.attempt["attempt_id"]), String(ownership.lease["lease_id"]), input.fencingGeneration, input.failureCode, input.failureCategory, input.retryable ? 1 : 0, input.safeMessage.slice(0, 800), input.occurredAt);
        const attemptsRemain = Number(ownership.job["attempt_count"]) < Number(ownership.job["max_attempts"]);
        const nextState = input.retryable && attemptsRemain ? "retrying" : "failed";
        database.prepare(`UPDATE page_jobs SET state = ?, next_eligible_at = ?, failed_at = CASE WHEN ? = 'failed' THEN ? ELSE NULL END, last_error_code = ?, last_error_category = ?, last_error_message = ?, claim_token = NULL, claimed_by = NULL, updated_at = ? WHERE job_id = ? AND state = 'processing' AND fencing_generation = ?`)
          .run(nextState, input.occurredAt, nextState, input.occurredAt, input.failureCode, input.failureCategory === "security" ? "validation" : "application", input.safeMessage.slice(0, 800), input.occurredAt, input.jobId, input.fencingGeneration);
        database.prepare("UPDATE job_attempts SET finished_at = ?, outcome = ?, error_code = ?, error_category = ?, safe_error_message = ? WHERE attempt_id = ? AND outcome = 'processing'")
          .run(input.occurredAt, nextState, input.failureCode, input.failureCategory === "security" ? "validation" : "application", input.safeMessage.slice(0, 800), String(ownership.attempt["attempt_id"]));
        database.prepare(`INSERT INTO job_transitions (transition_id, job_id, from_state, to_state, reason_code, operation_id, correlation_id, occurred_at, safe_metadata_json) VALUES (?, ?, 'processing', ?, ?, ?, ?, ?, ?)`)
          .run(id(), input.jobId, nextState, input.failureCode, input.operationId, input.operationId, input.occurredAt, JSON.stringify({ retryable: input.retryable, fencingGeneration: input.fencingGeneration }));
        database.prepare("UPDATE job_leases SET status = 'released', released_at = ?, release_reason = ?, last_operation_id = ? WHERE lease_id = ? AND status = 'active'")
          .run(input.occurredAt, input.failureCode, input.operationId, String(ownership.lease["lease_id"]));
        insertEvent(ownership, input.failureCode === "RENDER_CANCELLED" ? "cancelled" : "failed", input.failureCode === "RENDER_CANCELLED" ? "render.cancelled" : "render.failed", { failureCode: input.failureCode, retryable: input.retryable }, input.occurredAt);
        return rowToFailure(database.prepare("SELECT * FROM render_failures WHERE render_failure_id = ?").get(failureId) as Row);
      });
    },

    async getRenderStatus(input) {
      const row = database.prepare(`
        SELECT pj.job_id, pj.state, pj.fencing_generation, pj.updated_at,
          (SELECT stage FROM render_events re WHERE re.job_id = pj.job_id ORDER BY re.render_event_sequence DESC LIMIT 1) stage,
          (SELECT result_status FROM render_results rr WHERE rr.job_id = pj.job_id ORDER BY rr.created_at DESC LIMIT 1) result_status
        FROM page_jobs pj WHERE pj.project_id = ? AND pj.run_id = ? AND pj.job_id = ?
      `).get(input.projectId, input.runId, input.jobId) as Row | undefined;
      if (row === undefined) throw new QueueOperationError("QUEUE_JOB_NOT_FOUND", "The Render Page Job was not found");
      return { jobId: String(row["job_id"]), jobState: String(row["state"]) as RenderStatus["jobState"], stage: row["stage"] === null ? null : String(row["stage"]) as RenderStatus["stage"], resultStatus: row["result_status"] === null ? null : String(row["result_status"]) as RenderStatus["resultStatus"], fencingGeneration: Number(row["fencing_generation"]), updatedAt: String(row["updated_at"]) };
    },

    async getRenderResult(input) {
      const row = database.prepare("SELECT * FROM render_results WHERE project_id = ? AND run_id = ? AND job_id = ? ORDER BY created_at DESC LIMIT 1").get(input.projectId, input.runId, input.jobId) as Row | undefined;
      if (row === undefined) throw new RenderOperationError("RENDER_RESULT_NOT_FOUND", "No committed Render Result exists for the selected Page Job");
      return rowToResult(row);
    },

    async listRenderEvents(input) {
      const job = database.prepare("SELECT job_id FROM page_jobs WHERE project_id = ? AND run_id = ? AND job_id = ?").get(input.projectId, input.runId, input.jobId);
      if (job === undefined) throw new QueueOperationError("QUEUE_JOB_NOT_FOUND", "The Render Page Job was not found");
      const rows = database.prepare("SELECT * FROM render_events WHERE job_id = ? ORDER BY render_event_sequence ASC LIMIT ?").all(input.jobId, input.limit) as unknown as Row[];
      return rows.map(rowToEvent);
    },
  };
  return Object.freeze(repository);
}
