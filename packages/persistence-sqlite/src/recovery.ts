import { createHash, randomUUID } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import {
  QueueOperationError,
  RecoveryOperationError,
  type ArtifactCheckpoint,
  type CompletedOutputDescriptor,
  type JobCheckpoint,
  type JobLease,
  type JobLeaseStatus,
  type LeaseClaim,
  type PageJob,
  type PageJobState,
  type PauseStatus,
  type RecoveryInspectionItem,
  type RecoveryReport,
  type RecoveryRepositoryPort,
  type RunControlState,
} from "@offline-web-archive/archive-core";
import {
  CHECKPOINT_MODEL_VERSION,
  RECOVERY_LIMITS,
  calculateLeaseExpiry,
  isLeaseExpired,
  nextLeaseExpiry,
  parseUtc,
  validateArtifactCheckpoint,
  validateCheckpointPayload,
  validateCheckpointProgress,
  validateCompletedOutputDescriptor,
  validateLeaseDuration,
  validatePortableRelativePath,
  validateRecoveryLimit,
} from "@offline-web-archive/recovery";

type Row = Record<string, string | number | null>;

export type RecoveryFaultPoint =
  | "after-attempt-start"
  | "before-claim-commit"
  | "after-claim-commit"
  | "after-checkpoint-write"
  | "before-recovery-commit"
  | "after-recovery-commit"
  | "before-completion-descriptor-commit"
  | "after-completion-descriptor-commit";

export interface SqliteRecoveryRepositoryOptions {
  now?: () => string;
  id?: () => string;
  onEvent?: (eventName: string, metadata: Readonly<Record<string, unknown>>) => void;
  faultPoint?: (point: RecoveryFaultPoint) => void;
}

function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, ordered(child)]));
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(ordered(value));
}

function hash(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" ? value : canonicalJson(value), "utf8").digest("hex");
}

function rowToJob(row: Row): PageJob {
  const recoveryState = row["recovery_state"] === null ? null : String(row["recovery_state"]) as "interrupted" | "paused";
  return {
    jobId: String(row["job_id"]), projectId: String(row["project_id"]), runId: String(row["run_id"]),
    projectRevisionId: String(row["project_revision_id"]), profileId: String(row["profile_id"]), profileRevisionId: String(row["profile_revision_id"]),
    normalizationEngineVersion: Number(row["engine_version"]), jobType: "page", normalizedUrl: String(row["normalized_url"]), identityUrl: String(row["identity_url"]),
    safeDisplayUrl: String(row["safe_display_url"]), identityHash: String(row["identity_hash"]), scopeDecisionId: String(row["scope_decision_id"]),
    scopeReasonCode: String(row["scope_reason_code"]), state: recoveryState ?? String(row["state"]) as PageJobState, priority: Number(row["priority"]),
    prioritySource: String(row["priority_source"]) as "policy" | "explicit", queueSequence: Number(row["queue_sequence"]), depth: Number(row["depth"]),
    discoveryType: String(row["discovery_type"]) as PageJob["discoveryType"], attemptCount: Number(row["attempt_count"]), fencingGeneration: Number(row["fencing_generation"] ?? 0),
    maxAttempts: Number(row["max_attempts"]), nextEligibleAt: String(row["next_eligible_at"]), claimToken: row["claim_token"] === null ? null : String(row["claim_token"]),
    claimedBy: row["claimed_by"] === null ? null : String(row["claimed_by"]), claimedAt: row["claimed_at"] === null ? null : String(row["claimed_at"]),
    lastAttemptAt: row["last_attempt_at"] === null ? null : String(row["last_attempt_at"]), completedAt: row["completed_at"] === null ? null : String(row["completed_at"]),
    failedAt: row["failed_at"] === null ? null : String(row["failed_at"]), completionKey: row["completion_key"] === null ? null : String(row["completion_key"]),
    resultVersion: row["result_version"] === null ? null : Number(row["result_version"]), resultSummary: row["result_summary_json"] === null ? null : JSON.parse(String(row["result_summary_json"])) as PageJob["resultSummary"],
    lastErrorCode: row["last_error_code"] === null ? null : String(row["last_error_code"]), lastErrorCategory: row["last_error_category"] === null ? null : String(row["last_error_category"]) as PageJob["lastErrorCategory"],
    lastErrorMessage: row["last_error_message"] === null ? null : String(row["last_error_message"]), createdAt: String(row["created_at"]), updatedAt: String(row["updated_at"]), queuedAt: String(row["queued_at"]),
  };
}

function rowToLease(row: Row): JobLease {
  return {
    leaseId: String(row["lease_id"]), jobId: String(row["job_id"]), projectId: String(row["project_id"]), runId: String(row["run_id"]), ownerId: String(row["owner_id"]),
    fencingGeneration: Number(row["fencing_generation"]), status: String(row["status"]) as JobLeaseStatus, acquiredAt: String(row["acquired_at"]),
    heartbeatAt: String(row["heartbeat_at"]), expiresAt: String(row["expires_at"]), releasedAt: row["released_at"] === null ? null : String(row["released_at"]),
    releaseReason: row["release_reason"] === null ? null : String(row["release_reason"]),
  };
}

function rowToCheckpoint(row: Row): JobCheckpoint {
  return {
    checkpointId: String(row["checkpoint_id"]), jobId: String(row["job_id"]), attemptNumber: Number(row["attempt_number"]), sequence: Number(row["checkpoint_sequence"]),
    checkpointVersion: Number(row["checkpoint_version"]), fencingGeneration: Number(row["fencing_generation"]), ownerId: String(row["owner_id"]), phase: String(row["phase"]),
    progress: Number(row["progress"]), relativePath: row["relative_path"] === null ? null : String(row["relative_path"]), payload: JSON.parse(String(row["payload_json"])) as Record<string, unknown>,
    committed: Number(row["committed"]) === 1, supersedesCheckpointId: row["supersedes_checkpoint_id"] === null ? null : String(row["supersedes_checkpoint_id"]), createdAt: String(row["created_at"]),
  };
}

function rowToArtifact(row: Row): ArtifactCheckpoint {
  return {
    artifactCheckpointId: String(row["artifact_checkpoint_id"]), jobId: String(row["job_id"]), artifactKey: String(row["artifact_key"]), artifactKind: String(row["artifact_kind"]) as ArtifactCheckpoint["artifactKind"],
    relativePath: String(row["relative_path"]), bytesWritten: Number(row["bytes_written"]), expectedBytes: row["expected_bytes"] === null ? null : Number(row["expected_bytes"]),
    sha256: row["sha256"] === null ? null : String(row["sha256"]), validator: row["validator"] === null ? null : String(row["validator"]), resumeOffset: Number(row["resume_offset"]),
    fencingGeneration: Number(row["fencing_generation"]), committed: Number(row["committed"]) === 1, createdAt: String(row["created_at"]),
  };
}

function rowToOutput(row: Row): CompletedOutputDescriptor {
  return {
    descriptorId: String(row["descriptor_id"]), jobId: String(row["job_id"]), relativePath: String(row["relative_path"]), byteLength: Number(row["byte_length"]), sha256: String(row["sha256"]),
    verificationPolicy: "size-and-sha256", verifiedAt: row["verified_at"] === null ? null : String(row["verified_at"]), verificationStatus: String(row["verification_status"]) as CompletedOutputDescriptor["verificationStatus"],
  };
}

function rowToReport(row: Row): RecoveryReport {
  return {
    recoveryOperationId: String(row["recovery_operation_id"]), projectId: String(row["project_id"]), runId: String(row["run_id"]), status: String(row["status"]) as RecoveryReport["status"],
    dryRun: Number(row["dry_run"]) === 1, evaluationTime: String(row["evaluation_time"]), scanned: Number(row["scanned"]), interrupted: Number(row["interrupted"]),
    requeued: Number(row["requeued"]), paused: Number(row["paused"]), outputIssues: Number(row["output_issues"]), cursor: Number(row["cursor"]), hasMore: Number(row["has_more"]) === 1,
    items: JSON.parse(String(row["items_json"])) as RecoveryInspectionItem[], startedAt: String(row["started_at"]), completedAt: row["completed_at"] === null ? null : String(row["completed_at"]),
  };
}

export function createSqliteRecoveryRepository(database: DatabaseSync, options: SqliteRecoveryRepositoryOptions = {}): RecoveryRepositoryPort {
  const now = options.now ?? (() => new Date().toISOString());
  const id = options.id ?? randomUUID;
  const emit = options.onEvent ?? (() => undefined);
  const fault = options.faultPoint ?? (() => undefined);

  const transaction = <T>(operation: () => T): T => {
    try {
      database.exec("BEGIN IMMEDIATE");
      const result = operation();
      database.exec("COMMIT");
      return result;
    } catch (error) {
      if (database.isTransaction) database.exec("ROLLBACK");
      if (error instanceof RecoveryOperationError || error instanceof QueueOperationError) throw error;
      throw new RecoveryOperationError("RECOVERY_TRANSACTION_FAILED", "The recovery transaction failed safely", true);
    }
  };

  const validateOwnership = (projectId: string, runId: string): void => {
    const row = database.prepare(`
      SELECT r.run_id FROM project_metadata pm JOIN runs r ON r.project_id = pm.project_id
      WHERE pm.singleton_id = 1 AND pm.project_id = ? AND r.run_id = ?
    `).get(projectId, runId);
    if (row === undefined) throw new RecoveryOperationError("RECOVERY_INPUT_INVALID", "The Project and Run ownership boundary is invalid");
  };

  const getJobRow = (projectId: string, runId: string, jobId: string): Row => {
    const row = database.prepare("SELECT * FROM page_jobs WHERE project_id = ? AND run_id = ? AND job_id = ?").get(projectId, runId, jobId) as Row | undefined;
    if (row === undefined) throw new QueueOperationError("QUEUE_JOB_NOT_FOUND", "The Page Job was not found in the selected Project and Run");
    return row;
  };

  const activeLeaseRow = (projectId: string, runId: string, jobId: string): Row | undefined => database.prepare(`
    SELECT * FROM job_leases WHERE project_id = ? AND run_id = ? AND job_id = ? AND status = 'active'
  `).get(projectId, runId, jobId) as Row | undefined;

  const assertLease = (input: { projectId: string; runId: string; jobId: string; leaseToken: string; fencingGeneration: number; ownerId: string }, evaluationTime = now()): Row => {
    validateOwnership(input.projectId, input.runId);
    const leaseRow = activeLeaseRow(input.projectId, input.runId, input.jobId);
    if (leaseRow === undefined) throw new RecoveryOperationError("LEASE_NOT_FOUND", "No active Lease owns the Page Job");
    const lease = rowToLease(leaseRow);
    if (hash(input.leaseToken) !== String(leaseRow["lease_token_hash"])) throw new RecoveryOperationError("LEASE_TOKEN_INVALID", "The Lease Token is invalid");
    if (input.ownerId !== lease.ownerId) throw new RecoveryOperationError("LEASE_OWNER_MISMATCH", "The Lease owner does not match");
    if (input.fencingGeneration !== lease.fencingGeneration) throw new RecoveryOperationError("FENCING_GENERATION_STALE", "The Fencing Generation is stale");
    const job = rowToJob(getJobRow(input.projectId, input.runId, input.jobId));
    if (job.fencingGeneration !== input.fencingGeneration) throw new RecoveryOperationError("FENCING_GENERATION_STALE", "The Page Job has advanced to a newer owner");
    if (isLeaseExpired(lease, evaluationTime)) throw new RecoveryOperationError("LEASE_EXPIRED", "The Lease has expired");
    return leaseRow;
  };

  const transition = (input: { projectId: string; runId: string; jobId: string; from: PageJobState; to: PageJobState; reasonCode: string; operationId: string; correlationId: string; occurredAt: string; recoveryOperationId?: string | null; fencingGeneration?: number }): void => {
    const physicalFrom = input.from === "interrupted" || input.from === "paused" ? "processing" : input.from;
    const physicalTo = input.to === "interrupted" || input.to === "paused" ? "processing" : input.to;
    database.prepare(`
      INSERT INTO job_transitions
        (transition_id, job_id, from_state, to_state, reason_code, operation_id, correlation_id, occurred_at, safe_metadata_json, recovery_from_state, recovery_to_state)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, '{}', ?, ?)
    `).run(id(), input.jobId, physicalFrom, physicalTo, input.reasonCode, input.operationId, input.correlationId, input.occurredAt,
      input.from === "interrupted" || input.from === "paused" ? input.from : null,
      input.to === "interrupted" || input.to === "paused" ? input.to : null);
    database.prepare(`
      INSERT INTO recovery_events
        (recovery_event_id, recovery_operation_id, project_id, run_id, job_id, event_type, reason_code, from_state, to_state, fencing_generation, safe_metadata_json, occurred_at)
      VALUES (?, ?, ?, ?, ?, 'job.transition', ?, ?, ?, ?, '{}', ?)
    `).run(id(), input.recoveryOperationId ?? null, input.projectId, input.runId, input.jobId, input.reasonCode, input.from, input.to, input.fencingGeneration ?? null, input.occurredAt);
  };

  const runState = (projectId: string, runId: string): Row => {
    const row = database.prepare("SELECT * FROM run_control WHERE project_id = ? AND run_id = ?").get(projectId, runId) as Row | undefined;
    if (row === undefined) throw new RecoveryOperationError("RECOVERY_INPUT_INVALID", "Run control state is missing");
    return row;
  };

  const pauseStatus = (projectId: string, runId: string): PauseStatus => {
    const row = runState(projectId, runId);
    const activeLeaseCount = Number((database.prepare("SELECT COUNT(*) AS count FROM job_leases WHERE project_id = ? AND run_id = ? AND status = 'active'").get(projectId, runId) as { count: number }).count);
    return { projectId, runId, controlState: String(row["control_state"]) as RunControlState, requestedAt: row["requested_at"] === null ? null : String(row["requested_at"]), pausedAt: row["paused_at"] === null ? null : String(row["paused_at"]), activeLeaseCount };
  };

  const saveRunCheckpoint = (projectId: string, runId: string, operationId: string, timestamp: string): void => {
    const counts = database.prepare(`
      SELECT SUM(CASE WHEN state = 'pending' THEN 1 ELSE 0 END) pending,
        SUM(CASE WHEN state = 'processing' AND recovery_state IS NULL THEN 1 ELSE 0 END) processing,
        SUM(CASE WHEN state = 'completed' THEN 1 ELSE 0 END) completed
      FROM page_jobs WHERE project_id = ? AND run_id = ?
    `).get(projectId, runId) as Row;
    database.prepare(`
      INSERT INTO run_checkpoints (checkpoint_id, project_id, run_id, checkpoint_version, control_state, pending_jobs, processing_jobs, completed_jobs, operation_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id(), projectId, runId, CHECKPOINT_MODEL_VERSION, String(runState(projectId, runId)["control_state"]), Number(counts["pending"] ?? 0), Number(counts["processing"] ?? 0), Number(counts["completed"] ?? 0), operationId, timestamp);
  };

  const candidateRows = (projectId: string, runId: string, evaluationTime: string, afterSequence: number, limit: number): Row[] => database.prepare(`
    SELECT pj.*, jl.lease_id AS active_lease_id, jl.expires_at AS active_lease_expires_at
    FROM page_jobs pj
    LEFT JOIN job_leases jl ON jl.job_id = pj.job_id AND jl.status = 'active'
    WHERE pj.project_id = ? AND pj.run_id = ? AND pj.queue_sequence > ? AND (
      (pj.state = 'processing' AND pj.recovery_state IS NULL AND (jl.lease_id IS NULL OR jl.expires_at <= ?))
      OR (pj.state = 'completed' AND EXISTS (
        SELECT 1 FROM completed_outputs co WHERE co.job_id = pj.job_id AND co.verification_status <> 'valid'
      ))
    )
    ORDER BY pj.queue_sequence ASC LIMIT ?
  `).all(projectId, runId, afterSequence, evaluationTime, limit + 1) as unknown as Row[];

  const inspectionItem = (row: Row, evaluationTime: string): RecoveryInspectionItem => {
    const job = rowToJob(row);
    const outputIssue = job.state === "completed";
    const missingLease = row["active_lease_id"] === null;
    const expired = !missingLease && String(row["active_lease_expires_at"]) <= evaluationTime;
    return {
      jobId: job.jobId, queueSequence: job.queueSequence, currentState: job.state,
      reasonCode: outputIssue ? "COMPLETED_OUTPUT_REQUIRES_VERIFICATION" : expired ? "LEASE_EXPIRED" : "LEASE_MISSING",
      action: outputIssue ? "report-output" : "requeue", leaseId: row["active_lease_id"] === null ? null : String(row["active_lease_id"]), fencingGeneration: job.fencingGeneration,
    };
  };

  const getReportRow = (projectId: string, runId: string, recoveryOperationId: string): Row => {
    const row = database.prepare("SELECT * FROM recovery_operations WHERE project_id = ? AND run_id = ? AND recovery_operation_id = ?").get(projectId, runId, recoveryOperationId) as Row | undefined;
    if (row === undefined) throw new RecoveryOperationError("RECOVERY_OPERATION_NOT_FOUND", "The Recovery Operation was not found");
    return row;
  };

  return Object.freeze({
    async claimNextWithLease(input) {
      validateLeaseDuration(input.leaseDurationMs);
      const claimed = transaction(() => {
        validateOwnership(input.projectId, input.runId);
        if (String(runState(input.projectId, input.runId)["control_state"]) !== "active") throw new RecoveryOperationError("RUN_NOT_ACTIVE", "New claims are blocked while the Run is not active");
        const requestHash = hash({ ...input, correlationId: undefined, operationId: undefined });
        const existing = database.prepare("SELECT request_hash, result_json FROM queue_operations WHERE project_id = ? AND operation_type = 'recovery.claimNextWithLease' AND idempotency_key = ?")
          .get(input.projectId, input.idempotencyKey) as { request_hash: string; result_json: string } | undefined;
        if (existing !== undefined) {
          if (existing.request_hash !== requestHash) throw new QueueOperationError("QUEUE_OPERATION_IDEMPOTENCY_CONFLICT", "The idempotency key was already used for another Lease claim");
          const stored = JSON.parse(existing.result_json) as { jobId: string | null };
          if (stored.jobId === null) return null;
          const leaseRow = activeLeaseRow(input.projectId, input.runId, stored.jobId);
          const jobRow = getJobRow(input.projectId, input.runId, stored.jobId);
          const storedClaimToken = jobRow["claim_token"];
          if (leaseRow === undefined || typeof storedClaimToken !== "string" || hash(storedClaimToken) !== String(leaseRow["lease_token_hash"])) {
            throw new RecoveryOperationError("LEASE_NOT_FOUND", "The replayed Lease is no longer active");
          }
          return { job: rowToJob(jobRow), lease: rowToLease(leaseRow), leaseToken: storedClaimToken } satisfies LeaseClaim;
        }
        const timestamp = now();
        const row = database.prepare(`
          SELECT * FROM page_jobs WHERE project_id = ? AND run_id = ? AND state = 'pending' AND recovery_state IS NULL AND next_eligible_at <= ?
          ORDER BY priority DESC, next_eligible_at ASC, depth ASC, queue_sequence ASC, job_id ASC LIMIT 1
        `).get(input.projectId, input.runId, timestamp) as Row | undefined;
        if (row === undefined) {
          database.prepare(`INSERT INTO queue_operations (operation_record_id, project_id, run_id, operation_type, idempotency_key, request_hash, result_json, created_at) VALUES (?, ?, ?, 'recovery.claimNextWithLease', ?, ?, '{"jobId":null}', ?)`)
            .run(id(), input.projectId, input.runId, input.idempotencyKey, requestHash, timestamp);
          return null;
        }
        const job = rowToJob(row);
        if (job.attemptCount >= job.maxAttempts) throw new QueueOperationError("QUEUE_MAX_ATTEMPTS_REACHED", "The selected Job has exhausted its attempts");
        const leaseToken = id();
        const leaseId = id();
        const generation = job.fencingGeneration + 1;
        const attemptNumber = job.attemptCount + 1;
        const expiresAt = calculateLeaseExpiry(timestamp, input.leaseDurationMs);
        const updated = database.prepare(`
          UPDATE page_jobs SET state = 'processing', recovery_state = NULL, claim_token = ?, claimed_by = ?, claimed_at = ?, last_attempt_at = ?,
            attempt_count = ?, fencing_generation = ?, updated_at = ? WHERE job_id = ? AND state = 'pending' AND recovery_state IS NULL AND fencing_generation = ?
        `).run(leaseToken, input.ownerId, timestamp, timestamp, attemptNumber, generation, timestamp, job.jobId, job.fencingGeneration);
        if (updated.changes !== 1) throw new QueueOperationError("QUEUE_CLAIM_CONFLICT", "Another owner claimed the Page Job");
        database.prepare(`INSERT INTO job_attempts (attempt_id, job_id, attempt_number, claim_token, started_at, outcome, metadata_json) VALUES (?, ?, ?, ?, ?, 'processing', ?)`)
          .run(id(), job.jobId, attemptNumber, leaseToken, timestamp, canonicalJson({ fencingGeneration: generation, leaseId }));
        fault("after-attempt-start");
        database.prepare(`
          INSERT INTO job_leases (lease_id, job_id, project_id, run_id, owner_id, lease_token_hash, fencing_generation, status, acquired_at, heartbeat_at, expires_at, last_operation_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)
        `).run(leaseId, job.jobId, input.projectId, input.runId, input.ownerId, hash(leaseToken), generation, timestamp, timestamp, expiresAt, input.operationId);
        database.prepare(`INSERT INTO job_transitions (transition_id, job_id, from_state, to_state, reason_code, operation_id, correlation_id, occurred_at, safe_metadata_json) VALUES (?, ?, 'pending', 'processing', 'LEASE_CLAIMED', ?, ?, ?, ?)`)
          .run(id(), job.jobId, input.operationId, input.correlationId, timestamp, canonicalJson({ attemptNumber, fencingGeneration: generation, leaseId }));
        database.prepare(`INSERT INTO queue_operations (operation_record_id, project_id, run_id, operation_type, idempotency_key, request_hash, result_json, created_at) VALUES (?, ?, ?, 'recovery.claimNextWithLease', ?, ?, ?, ?)`)
          .run(id(), input.projectId, input.runId, input.idempotencyKey, requestHash, canonicalJson({ jobId: job.jobId }), timestamp);
        fault("before-claim-commit");
        const leaseRow = activeLeaseRow(input.projectId, input.runId, job.jobId)!;
        return { job: rowToJob(getJobRow(input.projectId, input.runId, job.jobId)), lease: rowToLease(leaseRow), leaseToken } satisfies LeaseClaim;
      });
      fault("after-claim-commit");
      if (claimed !== null) emit("lease.acquired", { projectId: input.projectId, runId: input.runId, jobId: claimed.job.jobId, leaseId: claimed.lease.leaseId, ownerId: input.ownerId, fencingGeneration: claimed.lease.fencingGeneration, expiresAt: claimed.lease.expiresAt });
      return claimed;
    },

    async heartbeatLease(input) {
      return transaction(() => {
        const lease = assertLease(input);
        const timestamp = now();
        const leaseId = String(lease["lease_id"]);
        database.prepare("UPDATE job_leases SET heartbeat_at = ?, last_operation_id = ? WHERE lease_id = ? AND status = 'active'").run(timestamp, input.operationId, leaseId);
        emit("lease.heartbeat", { projectId: input.projectId, runId: input.runId, jobId: input.jobId, leaseId: lease["lease_id"], ownerId: input.ownerId, fencingGeneration: input.fencingGeneration });
        return rowToLease(database.prepare("SELECT * FROM job_leases WHERE lease_id = ?").get(leaseId) as Row);
      });
    },

    async renewLease(input) {
      validateLeaseDuration(input.extensionMs);
      return transaction(() => {
        const leaseRow = assertLease(input);
        const timestamp = now();
        const expiresAt = nextLeaseExpiry(rowToLease(leaseRow), timestamp, input.extensionMs);
        const leaseId = String(leaseRow["lease_id"]);
        database.prepare("UPDATE job_leases SET heartbeat_at = ?, expires_at = ?, last_operation_id = ? WHERE lease_id = ? AND status = 'active'").run(timestamp, expiresAt, input.operationId, leaseId);
        emit("lease.renewed", { projectId: input.projectId, runId: input.runId, jobId: input.jobId, leaseId: leaseRow["lease_id"], ownerId: input.ownerId, fencingGeneration: input.fencingGeneration, expiresAt });
        return rowToLease(database.prepare("SELECT * FROM job_leases WHERE lease_id = ?").get(leaseId) as Row);
      });
    },

    async releaseLease(input) {
      return transaction(() => {
        const leaseRow = assertLease(input);
        const timestamp = now();
        const leaseId = String(leaseRow["lease_id"]);
        database.prepare("UPDATE job_leases SET status = 'released', released_at = ?, release_reason = ?, last_operation_id = ? WHERE lease_id = ? AND status = 'active'")
          .run(timestamp, input.reasonCode, input.operationId, leaseId);
        emit("lease.released", { projectId: input.projectId, runId: input.runId, jobId: input.jobId, leaseId: leaseRow["lease_id"], ownerId: input.ownerId, fencingGeneration: input.fencingGeneration, reasonCode: input.reasonCode });
        return rowToLease(database.prepare("SELECT * FROM job_leases WHERE lease_id = ?").get(leaseId) as Row);
      });
    },

    async listLeases(input) {
      validateOwnership(input.projectId, input.runId);
      if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > RECOVERY_LIMITS.leaseList) throw new RecoveryOperationError("RECOVERY_INPUT_INVALID", "Lease list limit is invalid");
      const rows = input.status === undefined
        ? database.prepare("SELECT * FROM job_leases WHERE project_id = ? AND run_id = ? ORDER BY acquired_at DESC, lease_id DESC LIMIT ?").all(input.projectId, input.runId, input.limit)
        : database.prepare("SELECT * FROM job_leases WHERE project_id = ? AND run_id = ? AND status = ? ORDER BY acquired_at DESC, lease_id DESC LIMIT ?").all(input.projectId, input.runId, input.status, input.limit);
      return (rows as unknown as Row[]).map(rowToLease);
    },

    async getLease(input) {
      validateOwnership(input.projectId, input.runId);
      const row = database.prepare("SELECT * FROM job_leases WHERE project_id = ? AND run_id = ? AND job_id = ? ORDER BY fencing_generation DESC LIMIT 1").get(input.projectId, input.runId, input.jobId) as Row | undefined;
      if (row === undefined) throw new RecoveryOperationError("LEASE_NOT_FOUND", "The Page Job has no Lease history");
      return rowToLease(row);
    },

    async saveJobCheckpoint(input) {
      return transaction(() => {
        assertLease(input);
        const timestamp = now();
        const job = rowToJob(getJobRow(input.projectId, input.runId, input.jobId));
        const payloadJson = validateCheckpointPayload(input.payload);
        validateCheckpointProgress(input.progress);
        const relativePath = input.relativePath ?? null;
        if (relativePath !== null) validatePortableRelativePath(relativePath);
        const previous = database.prepare("SELECT checkpoint_id FROM job_checkpoints WHERE job_id = ? AND committed = 1 ORDER BY checkpoint_sequence DESC LIMIT 1").get(input.jobId) as { checkpoint_id: string } | undefined;
        const checkpointId = id();
        database.prepare(`
          INSERT INTO job_checkpoints (checkpoint_id, job_id, attempt_number, checkpoint_version, fencing_generation, owner_id, phase, progress, relative_path, payload_json, committed, supersedes_checkpoint_id, operation_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
        `).run(checkpointId, input.jobId, job.attemptCount, CHECKPOINT_MODEL_VERSION, input.fencingGeneration, input.ownerId, input.phase, input.progress, relativePath, payloadJson, previous?.checkpoint_id ?? null, input.operationId, timestamp);
        fault("after-checkpoint-write");
        emit("checkpoint.committed", { projectId: input.projectId, runId: input.runId, jobId: input.jobId, checkpointId, attemptNumber: job.attemptCount, fencingGeneration: input.fencingGeneration, phase: input.phase, progress: input.progress });
        return rowToCheckpoint(database.prepare("SELECT * FROM job_checkpoints WHERE checkpoint_id = ?").get(checkpointId) as Row);
      });
    },

    async getLatestJobCheckpoint(input) {
      validateOwnership(input.projectId, input.runId);
      getJobRow(input.projectId, input.runId, input.jobId);
      const row = database.prepare("SELECT * FROM job_checkpoints WHERE job_id = ? AND committed = 1 ORDER BY checkpoint_sequence DESC LIMIT 1").get(input.jobId) as Row | undefined;
      return row === undefined ? null : rowToCheckpoint(row);
    },

    async listJobCheckpoints(input) {
      validateOwnership(input.projectId, input.runId);
      getJobRow(input.projectId, input.runId, input.jobId);
      if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > RECOVERY_LIMITS.checkpointList) throw new RecoveryOperationError("RECOVERY_INPUT_INVALID", "Checkpoint list limit is invalid");
      return (database.prepare("SELECT * FROM job_checkpoints WHERE job_id = ? ORDER BY checkpoint_sequence DESC LIMIT ?").all(input.jobId, input.limit) as unknown as Row[]).map(rowToCheckpoint);
    },

    async saveArtifactCheckpoint(input) {
      return transaction(() => {
        assertLease(input);
        validateArtifactCheckpoint({ artifactKey: input.artifactKey, relativePath: input.relativePath, bytesWritten: input.bytesWritten, expectedBytes: input.expectedBytes ?? null, sha256: input.sha256 ?? null, resumeOffset: input.resumeOffset });
        const artifactCheckpointId = id();
        const timestamp = now();
        database.prepare(`
          INSERT INTO artifact_checkpoints (artifact_checkpoint_id, job_id, artifact_key, artifact_kind, relative_path, bytes_written, expected_bytes, sha256, validator, resume_offset, fencing_generation, committed, operation_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(artifactCheckpointId, input.jobId, input.artifactKey, input.artifactKind, input.relativePath, input.bytesWritten, input.expectedBytes ?? null, input.sha256 ?? null, input.validator ?? null, input.resumeOffset, input.fencingGeneration, input.committed ? 1 : 0, input.operationId, timestamp);
        emit("artifact-checkpoint.committed", { projectId: input.projectId, runId: input.runId, jobId: input.jobId, artifactCheckpointId, artifactKind: input.artifactKind, bytesWritten: input.bytesWritten, committed: input.committed, fencingGeneration: input.fencingGeneration });
        return rowToArtifact(database.prepare("SELECT * FROM artifact_checkpoints WHERE artifact_checkpoint_id = ?").get(artifactCheckpointId) as Row);
      });
    },

    async validateArtifactCheckpoint(input) {
      validateOwnership(input.projectId, input.runId);
      getJobRow(input.projectId, input.runId, input.jobId);
      const row = database.prepare("SELECT * FROM artifact_checkpoints WHERE job_id = ? AND artifact_key = ? ORDER BY created_at DESC, artifact_checkpoint_id DESC LIMIT 1").get(input.jobId, input.artifactKey) as Row | undefined;
      if (row === undefined) return { valid: false, checkpoint: null, reasonCode: "ARTIFACT_CHECKPOINT_NOT_FOUND" };
      const checkpoint = rowToArtifact(row);
      try {
        validateArtifactCheckpoint(checkpoint);
        return { valid: checkpoint.committed, checkpoint, reasonCode: checkpoint.committed ? null : "ARTIFACT_CHECKPOINT_UNCOMMITTED" };
      } catch {
        return { valid: false, checkpoint, reasonCode: "ARTIFACT_CHECKPOINT_INVALID" };
      }
    },

    async saveCompletedOutputs(input) {
      const descriptors = transaction(() => {
        assertLease(input);
        const timestamp = now();
        const result: CompletedOutputDescriptor[] = [];
        for (const output of input.outputs) {
          const descriptor = validateCompletedOutputDescriptor({ ...output, descriptorId: id(), jobId: input.jobId, verifiedAt: null, verificationStatus: "pending" });
          const existing = database.prepare("SELECT * FROM completed_outputs WHERE job_id = ? AND relative_path = ?").get(input.jobId, descriptor.relativePath) as Row | undefined;
          if (existing !== undefined) {
            const value = rowToOutput(existing);
            if (value.byteLength !== descriptor.byteLength || value.sha256 !== descriptor.sha256) throw new RecoveryOperationError("OUTPUT_DESCRIPTOR_INVALID", "A different output descriptor already exists for this path");
            result.push(value);
            continue;
          }
          database.prepare(`INSERT INTO completed_outputs (descriptor_id, job_id, relative_path, byte_length, sha256, verification_policy, verification_status) VALUES (?, ?, ?, ?, ?, 'size-and-sha256', 'pending')`)
            .run(descriptor.descriptorId, descriptor.jobId, descriptor.relativePath, descriptor.byteLength, descriptor.sha256);
          result.push(descriptor);
        }
        fault("before-completion-descriptor-commit");
        emit("completed-output.recorded", { projectId: input.projectId, runId: input.runId, jobId: input.jobId, outputCount: result.length, fencingGeneration: input.fencingGeneration, recordedAt: timestamp });
        return result;
      });
      fault("after-completion-descriptor-commit");
      return descriptors;
    },

    async inspectRecovery(input) {
      validateOwnership(input.projectId, input.runId);
      parseUtc(input.evaluationTime, "evaluationTime");
      validateRecoveryLimit(input.limit);
      const after = input.afterSequence ?? 0;
      if (!Number.isInteger(after) || after < 0) throw new RecoveryOperationError("RECOVERY_INPUT_INVALID", "Recovery cursor is invalid");
      return transaction(() => {
        const rows = candidateRows(input.projectId, input.runId, input.evaluationTime, after, input.limit);
        const hasMore = rows.length > input.limit;
        const selected = rows.slice(0, input.limit);
        const items = selected.map((row) => inspectionItem(row, input.evaluationTime));
        const recoveryOperationId = id();
        const timestamp = now();
        const cursor = selected.at(-1) === undefined ? after : Number(selected.at(-1)!["queue_sequence"]);
        const interrupted = items.filter((item) => item.action === "requeue").length;
        const outputIssues = items.filter((item) => item.action === "report-output").length;
        database.prepare(`
          INSERT INTO recovery_operations (recovery_operation_id, project_id, run_id, idempotency_key, request_hash, status, dry_run, evaluation_time, batch_limit, cursor, scanned, interrupted, output_issues, has_more, items_json, owner_operation_id, started_at, completed_at)
          VALUES (?, ?, ?, ?, ?, 'inspected', 1, ?, ?, ?, ?, ?, ?, ?, ?, 'inspect', ?, ?)
        `).run(recoveryOperationId, input.projectId, input.runId, `inspect-${recoveryOperationId}`, hash(input), input.evaluationTime, input.limit, cursor, items.length, interrupted, outputIssues, hasMore ? 1 : 0, canonicalJson(items), timestamp, timestamp);
        emit("recovery.inspected", { projectId: input.projectId, runId: input.runId, recoveryOperationId, scanned: items.length, interrupted, outputIssues, hasMore, evaluationTime: input.evaluationTime });
        return rowToReport(getReportRow(input.projectId, input.runId, recoveryOperationId));
      });
    },

    async recover(input) {
      if (input.confirmation !== "APPLY-RECOVERY") throw new RecoveryOperationError("RECOVERY_CONFIRMATION_REQUIRED", "Applying recovery requires explicit confirmation");
      parseUtc(input.evaluationTime, "evaluationTime");
      validateRecoveryLimit(input.limit);
      const report = transaction(() => {
        validateOwnership(input.projectId, input.runId);
        const requestHash = hash({ projectId: input.projectId, runId: input.runId, evaluationTime: input.evaluationTime, limit: input.limit, confirmation: input.confirmation });
        const existing = database.prepare("SELECT * FROM recovery_operations WHERE project_id = ? AND run_id = ? AND idempotency_key = ?").get(input.projectId, input.runId, input.idempotencyKey) as Row | undefined;
        if (existing !== undefined && String(existing["request_hash"]) !== requestHash) throw new QueueOperationError("QUEUE_OPERATION_IDEMPOTENCY_CONFLICT", "The Recovery idempotency key was used for another request");
        if (existing !== undefined && Number(existing["has_more"]) === 0 && String(existing["status"]) === "completed") return rowToReport(existing);
        const timestamp = now();
        const recoveryOperationId = existing === undefined ? id() : String(existing["recovery_operation_id"]);
        const cursor = existing === undefined ? 0 : Number(existing["cursor"]);
        const previousItems = existing === undefined ? [] : JSON.parse(String(existing["items_json"])) as RecoveryInspectionItem[];
        if (existing === undefined) {
          database.prepare(`
            INSERT INTO recovery_operations (recovery_operation_id, project_id, run_id, idempotency_key, request_hash, status, dry_run, evaluation_time, batch_limit, items_json, owner_operation_id, started_at)
            VALUES (?, ?, ?, ?, ?, 'in_progress', 0, ?, ?, '[]', ?, ?)
          `).run(recoveryOperationId, input.projectId, input.runId, input.idempotencyKey, requestHash, input.evaluationTime, input.limit, input.operationId, timestamp);
        } else {
          database.prepare("UPDATE recovery_operations SET status = 'in_progress', owner_operation_id = ? WHERE recovery_operation_id = ?").run(input.operationId, recoveryOperationId);
        }
        const priorControl = String(runState(input.projectId, input.runId)["control_state"]) as RunControlState;
        if (priorControl === "recovering") throw new RecoveryOperationError("RECOVERY_ALREADY_RUNNING", "Another Recovery Operation owns this Run");
        database.prepare("UPDATE run_control SET control_state = 'recovering', updated_at = ?, operation_id = ? WHERE project_id = ? AND run_id = ?")
          .run(timestamp, input.operationId, input.projectId, input.runId);
        const rows = candidateRows(input.projectId, input.runId, input.evaluationTime, cursor, input.limit);
        const hasMore = rows.length > input.limit;
        const selected = rows.slice(0, input.limit);
        const items: RecoveryInspectionItem[] = [];
        let interrupted = 0;
        let requeued = 0;
        let paused = 0;
        let outputIssues = 0;
        for (const row of selected) {
          const initial = inspectionItem(row, input.evaluationTime);
          const job = rowToJob(row);
          if (job.state === "completed") {
            items.push(initial);
            outputIssues += 1;
            continue;
          }
          const leaseRow = activeLeaseRow(input.projectId, input.runId, job.jobId);
          if (leaseRow !== undefined) database.prepare("UPDATE job_leases SET status = 'recovered', released_at = ?, release_reason = 'LEASE_EXPIRED_RECOVERY', last_operation_id = ? WHERE lease_id = ? AND status = 'active'")
            .run(timestamp, input.operationId, String(leaseRow["lease_id"]));
          const pauseRequested = priorControl === "pause_requested" || priorControl === "paused";
          const effectiveState: "paused" | "interrupted" = pauseRequested ? "paused" : "interrupted";
          database.prepare("UPDATE job_attempts SET finished_at = ?, outcome = 'failed', recovery_outcome = ?, error_code = ?, error_category = 'platform', safe_error_message = 'The prior owner ended before committing a terminal result.' WHERE job_id = ? AND claim_token = ? AND finished_at IS NULL")
            .run(timestamp, effectiveState, pauseRequested ? "PAUSE_ACKNOWLEDGED_BY_RECOVERY" : "LEASE_EXPIRED", job.jobId, job.claimToken);
          database.prepare("UPDATE page_jobs SET recovery_state = ?, updated_at = ? WHERE job_id = ? AND state = 'processing'").run(effectiveState, timestamp, job.jobId);
          transition({ projectId: input.projectId, runId: input.runId, jobId: job.jobId, from: "processing", to: effectiveState, reasonCode: pauseRequested ? "PAUSE_ACKNOWLEDGED_BY_RECOVERY" : "LEASE_EXPIRED", operationId: input.operationId, correlationId: input.correlationId, occurredAt: timestamp, recoveryOperationId, fencingGeneration: job.fencingGeneration });
          interrupted += effectiveState === "interrupted" ? 1 : 0;
          if (pauseRequested) {
            paused += 1;
            items.push({ ...initial, action: "pause", reasonCode: "PAUSE_ACKNOWLEDGED_BY_RECOVERY" });
            continue;
          }
          const target: "pending" | "failed" = job.attemptCount < job.maxAttempts ? "pending" : "failed";
          if (target === "pending") {
            database.prepare("UPDATE page_jobs SET state = 'pending', recovery_state = NULL, claim_token = NULL, claimed_by = NULL, claimed_at = NULL, updated_at = ? WHERE job_id = ? AND state = 'processing'").run(timestamp, job.jobId);
            requeued += 1;
          } else {
            database.prepare("UPDATE page_jobs SET state = 'failed', recovery_state = NULL, claim_token = NULL, claimed_by = NULL, claimed_at = NULL, failed_at = ?, last_error_code = 'RECOVERY_ATTEMPTS_EXHAUSTED', last_error_category = 'platform', last_error_message = 'Recovery could not requeue an exhausted Job.', updated_at = ? WHERE job_id = ? AND state = 'processing'")
              .run(timestamp, timestamp, job.jobId);
          }
          transition({ projectId: input.projectId, runId: input.runId, jobId: job.jobId, from: "interrupted", to: target, reasonCode: target === "pending" ? "RECOVERY_REQUEUED" : "RECOVERY_ATTEMPTS_EXHAUSTED", operationId: input.operationId, correlationId: input.correlationId, occurredAt: timestamp, recoveryOperationId, fencingGeneration: job.fencingGeneration });
          items.push({ ...initial, action: target === "pending" ? "requeue" : "none", reasonCode: target === "pending" ? "RECOVERY_REQUEUED" : "RECOVERY_ATTEMPTS_EXHAUSTED" });
        }
        const activeCount = Number((database.prepare("SELECT COUNT(*) AS count FROM job_leases WHERE project_id = ? AND run_id = ? AND status = 'active'").get(input.projectId, input.runId) as { count: number }).count);
        const restoredControl: RunControlState = (priorControl === "pause_requested" || priorControl === "paused") && activeCount === 0 ? "paused" : priorControl === "pause_requested" ? "pause_requested" : "active";
        database.prepare("UPDATE run_control SET control_state = ?, paused_at = CASE WHEN ? = 'paused' THEN ? ELSE paused_at END, updated_at = ?, operation_id = ? WHERE project_id = ? AND run_id = ?")
          .run(restoredControl, restoredControl, timestamp, timestamp, input.operationId, input.projectId, input.runId);
        const nextCursor = selected.at(-1) === undefined ? cursor : Number(selected.at(-1)!["queue_sequence"]);
        const combinedItems = [...previousItems, ...items].slice(-RECOVERY_LIMITS.recoveryBatchMaximum);
        const cumulative = {
          scanned: Number(existing?.["scanned"] ?? 0) + items.length,
          interrupted: Number(existing?.["interrupted"] ?? 0) + interrupted,
          requeued: Number(existing?.["requeued"] ?? 0) + requeued,
          paused: Number(existing?.["paused"] ?? 0) + paused,
          outputIssues: Number(existing?.["output_issues"] ?? 0) + outputIssues,
        };
        database.prepare(`
          UPDATE recovery_operations SET status = 'completed', cursor = ?, scanned = ?, interrupted = ?, requeued = ?, paused = ?, output_issues = ?, has_more = ?, items_json = ?, completed_at = ?
          WHERE recovery_operation_id = ?
        `).run(nextCursor, cumulative.scanned, cumulative.interrupted, cumulative.requeued, cumulative.paused, cumulative.outputIssues, hasMore ? 1 : 0, canonicalJson(combinedItems), timestamp, recoveryOperationId);
        saveRunCheckpoint(input.projectId, input.runId, input.operationId, timestamp);
        fault("before-recovery-commit");
        return rowToReport(getReportRow(input.projectId, input.runId, recoveryOperationId));
      });
      fault("after-recovery-commit");
      emit("recovery.completed", { projectId: input.projectId, runId: input.runId, recoveryOperationId: report.recoveryOperationId, scanned: report.scanned, interrupted: report.interrupted, requeued: report.requeued, paused: report.paused, outputIssues: report.outputIssues, hasMore: report.hasMore });
      return report;
    },

    async getRecoveryReport(input) {
      validateOwnership(input.projectId, input.runId);
      return rowToReport(getReportRow(input.projectId, input.runId, input.recoveryOperationId));
    },

    async requestPause(input) {
      return transaction(() => {
        validateOwnership(input.projectId, input.runId);
        const current = String(runState(input.projectId, input.runId)["control_state"]) as RunControlState;
        if (["completed", "failed", "stopped", "recovering"].includes(current)) throw new RecoveryOperationError("RUN_PAUSE_CONFLICT", "The current Run state cannot accept a pause request");
        if (current === "paused" || current === "pause_requested") return pauseStatus(input.projectId, input.runId);
        const timestamp = now();
        const active = Number((database.prepare("SELECT COUNT(*) AS count FROM job_leases WHERE project_id = ? AND run_id = ? AND status = 'active'").get(input.projectId, input.runId) as { count: number }).count);
        const target: RunControlState = active === 0 ? "paused" : "pause_requested";
        database.prepare("UPDATE run_control SET control_state = ?, requested_at = ?, paused_at = ?, updated_at = ?, operation_id = ? WHERE project_id = ? AND run_id = ?")
          .run(target, timestamp, target === "paused" ? timestamp : null, timestamp, input.operationId, input.projectId, input.runId);
        saveRunCheckpoint(input.projectId, input.runId, input.operationId, timestamp);
        emit("run.pause-requested", { projectId: input.projectId, runId: input.runId, controlState: target, activeLeaseCount: active });
        return pauseStatus(input.projectId, input.runId);
      });
    },

    async getPauseStatus(input) {
      validateOwnership(input.projectId, input.runId);
      return pauseStatus(input.projectId, input.runId);
    },

    async acknowledgePause(input) {
      return transaction(() => {
        const control = String(runState(input.projectId, input.runId)["control_state"]);
        if (control !== "pause_requested") throw new RecoveryOperationError("RUN_PAUSE_CONFLICT", "The Run has no pending pause request");
        const leaseRow = assertLease(input);
        const timestamp = now();
        const job = rowToJob(getJobRow(input.projectId, input.runId, input.jobId));
        const checkpointId = id();
        database.prepare(`INSERT INTO job_checkpoints (checkpoint_id, job_id, attempt_number, checkpoint_version, fencing_generation, owner_id, phase, progress, payload_json, committed, operation_id, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pause', 1, '{"reason":"cooperative-pause"}', 1, ?, ?)`)
          .run(checkpointId, job.jobId, job.attemptCount, CHECKPOINT_MODEL_VERSION, input.fencingGeneration, input.ownerId, input.operationId, timestamp);
        database.prepare("UPDATE job_leases SET status = 'released', released_at = ?, release_reason = 'PAUSE_ACKNOWLEDGED', last_operation_id = ? WHERE lease_id = ? AND status = 'active'")
          .run(timestamp, input.operationId, String(leaseRow["lease_id"]));
        database.prepare("UPDATE job_attempts SET finished_at = ?, outcome = 'failed', recovery_outcome = 'paused', error_code = 'PAUSE_ACKNOWLEDGED', error_category = 'application', safe_error_message = 'The owner cooperatively paused after a committed checkpoint.' WHERE job_id = ? AND claim_token = ? AND finished_at IS NULL")
          .run(timestamp, job.jobId, input.leaseToken);
        database.prepare("UPDATE page_jobs SET recovery_state = 'paused', updated_at = ? WHERE job_id = ? AND state = 'processing'").run(timestamp, job.jobId);
        transition({ projectId: input.projectId, runId: input.runId, jobId: job.jobId, from: "processing", to: "paused", reasonCode: "PAUSE_ACKNOWLEDGED", operationId: input.operationId, correlationId: input.correlationId, occurredAt: timestamp, fencingGeneration: input.fencingGeneration });
        const active = Number((database.prepare("SELECT COUNT(*) AS count FROM job_leases WHERE project_id = ? AND run_id = ? AND status = 'active'").get(input.projectId, input.runId) as { count: number }).count);
        if (active === 0) database.prepare("UPDATE run_control SET control_state = 'paused', paused_at = ?, updated_at = ?, operation_id = ? WHERE project_id = ? AND run_id = ?").run(timestamp, timestamp, input.operationId, input.projectId, input.runId);
        saveRunCheckpoint(input.projectId, input.runId, input.operationId, timestamp);
        emit("run.pause-acknowledged", { projectId: input.projectId, runId: input.runId, jobId: input.jobId, checkpointId, fencingGeneration: input.fencingGeneration, activeLeaseCount: active });
        return rowToJob(getJobRow(input.projectId, input.runId, input.jobId));
      });
    },

    async resumeRun(input) {
      return transaction(() => {
        validateOwnership(input.projectId, input.runId);
        const current = String(runState(input.projectId, input.runId)["control_state"]) as RunControlState;
        if (current === "active") return pauseStatus(input.projectId, input.runId);
        if (current === "recovering" || current === "completed" || current === "failed" || current === "stopped") throw new RecoveryOperationError("RUN_PAUSE_CONFLICT", "The current Run state cannot resume");
        const timestamp = now();
        database.prepare("UPDATE run_control SET control_state = 'resuming', updated_at = ?, operation_id = ? WHERE project_id = ? AND run_id = ?").run(timestamp, input.operationId, input.projectId, input.runId);
        const rows = database.prepare("SELECT * FROM page_jobs WHERE project_id = ? AND run_id = ? AND state = 'processing' AND recovery_state IN ('paused', 'interrupted') ORDER BY queue_sequence").all(input.projectId, input.runId) as unknown as Row[];
        for (const row of rows) {
          const job = rowToJob(row);
          database.prepare("UPDATE page_jobs SET state = 'pending', recovery_state = NULL, claim_token = NULL, claimed_by = NULL, claimed_at = NULL, updated_at = ? WHERE job_id = ?").run(timestamp, job.jobId);
          transition({ projectId: input.projectId, runId: input.runId, jobId: job.jobId, from: job.state, to: "pending", reasonCode: "RUN_RESUMED", operationId: input.operationId, correlationId: input.correlationId, occurredAt: timestamp, fencingGeneration: job.fencingGeneration });
        }
        database.prepare("UPDATE run_control SET control_state = 'active', requested_at = NULL, paused_at = NULL, updated_at = ?, operation_id = ? WHERE project_id = ? AND run_id = ?")
          .run(timestamp, input.operationId, input.projectId, input.runId);
        saveRunCheckpoint(input.projectId, input.runId, input.operationId, timestamp);
        emit("run.resumed", { projectId: input.projectId, runId: input.runId, requeued: rows.length });
        return pauseStatus(input.projectId, input.runId);
      });
    },

    async getRunControlState(input) {
      validateOwnership(input.projectId, input.runId);
      return pauseStatus(input.projectId, input.runId);
    },

    async verifyCompletedOutput(input) {
      validateOwnership(input.projectId, input.runId);
      const job = rowToJob(getJobRow(input.projectId, input.runId, input.jobId));
      if (job.state !== "completed") throw new RecoveryOperationError("OUTPUT_VERIFICATION_FAILED", "Only completed Jobs have terminal output descriptors");
      const rows = database.prepare("SELECT * FROM completed_outputs WHERE job_id = ? ORDER BY relative_path").all(input.jobId) as unknown as Row[];
      const root = path.resolve(input.projectRoot);
      const results: CompletedOutputDescriptor[] = [];
      for (const row of rows) {
        const descriptor = rowToOutput(row);
        validateCompletedOutputDescriptor(descriptor);
        const target = path.resolve(root, ...descriptor.relativePath.split("/"));
        if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw new RecoveryOperationError("OUTPUT_DESCRIPTOR_INVALID", "Completed output escapes the Project root");
        let status: CompletedOutputDescriptor["verificationStatus"] = "valid";
        try {
          const stat = await lstat(target);
          if (stat.isSymbolicLink() || !stat.isFile()) status = "missing";
          else if (stat.size !== descriptor.byteLength) status = "size-mismatch";
          else if (createHash("sha256").update(await readFile(target)).digest("hex") !== descriptor.sha256) status = "hash-mismatch";
        } catch {
          status = "missing";
        }
        const timestamp = now();
        database.prepare("UPDATE completed_outputs SET verification_status = ?, verified_at = ? WHERE descriptor_id = ?").run(status, timestamp, descriptor.descriptorId);
        results.push({ ...descriptor, verificationStatus: status, verifiedAt: timestamp });
      }
      emit("completed-output.verified", { projectId: input.projectId, runId: input.runId, jobId: input.jobId, outputCount: results.length, invalidCount: results.filter((entry) => entry.verificationStatus !== "valid").length });
      return results;
    },

    async beginExecutionSession(input) {
      return transaction(() => {
        validateOwnership(input.projectId, input.runId);
        if (!Number.isInteger(input.processId) || input.processId < 1 || input.hostId.length < 1 || input.hostId.length > 160) throw new RecoveryOperationError("RECOVERY_INPUT_INVALID", "Execution Session identity is invalid");
        const timestamp = now();
        database.prepare("UPDATE execution_sessions SET closed_at = ?, close_kind = 'unclean-detected' WHERE project_id = ? AND run_id = ? AND closed_at IS NULL")
          .run(timestamp, input.projectId, input.runId);
        const sessionId = id();
        database.prepare("INSERT INTO execution_sessions (session_id, project_id, run_id, process_id, host_id, started_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .run(sessionId, input.projectId, input.runId, input.processId, input.hostId, timestamp, timestamp);
        emit("execution-session.started", { projectId: input.projectId, runId: input.runId, sessionId, processId: input.processId, hostId: input.hostId });
        return sessionId;
      });
    },

    async endExecutionSession(input) {
      transaction(() => {
        validateOwnership(input.projectId, input.runId);
        const timestamp = now();
        const result = database.prepare("UPDATE execution_sessions SET last_seen_at = ?, closed_at = ?, close_kind = 'clean' WHERE session_id = ? AND project_id = ? AND run_id = ? AND closed_at IS NULL")
          .run(timestamp, timestamp, input.sessionId, input.projectId, input.runId);
        if (result.changes !== 1) throw new RecoveryOperationError("RECOVERY_INPUT_INVALID", "Execution Session is missing or already closed");
        emit("execution-session.closed", { projectId: input.projectId, runId: input.runId, sessionId: input.sessionId });
      });
    },
  } satisfies RecoveryRepositoryPort);
}
