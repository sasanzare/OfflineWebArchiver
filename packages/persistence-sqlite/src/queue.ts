import { createHash, randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  QueueOperationError,
  type PageJob,
  type PageJobAttempt,
  type PageJobDiscovery,
  type PageJobState,
  type PageJobTransition,
  type QueueBatchResult,
  type QueueEnqueueInput,
  type QueueEnqueueResult,
  type QueueFailureCategory,
  type QueueHistory,
  type QueueListResult,
  type QueueRepositoryPort,
  type QueueResultSummary,
  type QueueStatistics,
} from "@offline-web-archive/archive-core";
import {
  QUEUE_LIMITS,
  assertAttemptPolicy,
  assertIdempotencyKey,
  assertPriority,
  assertTransition,
  assertUtcTimestamp,
  calculatePriority,
  minimumDepth,
  sanitizeSafeMessage,
  shouldRetry,
  validateResultSummary,
} from "@offline-web-archive/queue";

type Row = Record<string, string | number | null>;

export interface SqliteQueueRepositoryOptions {
  now?: () => string;
  id?: () => string;
  onEvent?: (eventName: string, metadata: Readonly<Record<string, unknown>>) => void;
}

function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([key, child]) => [key, ordered(child)]));
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(ordered(value));
}

function hash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

function idempotencyRequest(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([key]) => !["idempotencyKey", "operationId", "correlationId"].includes(key)));
}

function parseJson<T>(value: string | null): T | null {
  return value === null ? null : JSON.parse(value) as T;
}

function rowToJob(row: Row): PageJob {
  const recoveryState = row["recovery_state"] === null || row["recovery_state"] === undefined
    ? null
    : String(row["recovery_state"]) as "interrupted" | "paused";
  return {
    jobId: String(row["job_id"]),
    projectId: String(row["project_id"]),
    runId: String(row["run_id"]),
    projectRevisionId: String(row["project_revision_id"]),
    profileId: String(row["profile_id"]),
    profileRevisionId: String(row["profile_revision_id"]),
    normalizationEngineVersion: Number(row["engine_version"]),
    jobType: "page",
    normalizedUrl: String(row["normalized_url"]),
    identityUrl: String(row["identity_url"]),
    safeDisplayUrl: String(row["safe_display_url"]),
    identityHash: String(row["identity_hash"]),
    scopeDecisionId: String(row["scope_decision_id"]),
    scopeReasonCode: String(row["scope_reason_code"]),
    state: recoveryState ?? String(row["state"]) as PageJobState,
    priority: Number(row["priority"]),
    prioritySource: String(row["priority_source"]) as "policy" | "explicit",
    queueSequence: Number(row["queue_sequence"]),
    depth: Number(row["depth"]),
    discoveryType: String(row["discovery_type"]) as PageJob["discoveryType"],
    attemptCount: Number(row["attempt_count"]),
    fencingGeneration: Number(row["fencing_generation"] ?? 0),
    maxAttempts: Number(row["max_attempts"]),
    nextEligibleAt: String(row["next_eligible_at"]),
    claimToken: row["claim_token"] === null ? null : String(row["claim_token"]),
    claimedBy: row["claimed_by"] === null ? null : String(row["claimed_by"]),
    claimedAt: row["claimed_at"] === null ? null : String(row["claimed_at"]),
    lastAttemptAt: row["last_attempt_at"] === null ? null : String(row["last_attempt_at"]),
    completedAt: row["completed_at"] === null ? null : String(row["completed_at"]),
    failedAt: row["failed_at"] === null ? null : String(row["failed_at"]),
    completionKey: row["completion_key"] === null ? null : String(row["completion_key"]),
    resultVersion: row["result_version"] === null ? null : Number(row["result_version"]),
    resultSummary: parseJson<QueueResultSummary>(row["result_summary_json"] === null ? null : String(row["result_summary_json"])),
    lastErrorCode: row["last_error_code"] === null ? null : String(row["last_error_code"]),
    lastErrorCategory: row["last_error_category"] === null ? null : String(row["last_error_category"]) as QueueFailureCategory,
    lastErrorMessage: row["last_error_message"] === null ? null : String(row["last_error_message"]),
    createdAt: String(row["created_at"]),
    updatedAt: String(row["updated_at"]),
    queuedAt: String(row["queued_at"]),
  };
}

function rowToDiscovery(row: Row): PageJobDiscovery {
  return {
    discoveryId: String(row["discovery_id"]),
    parentJobId: row["parent_job_id"] === null ? null : String(row["parent_job_id"]),
    childJobId: String(row["child_job_id"]),
    safeSourceUrl: row["safe_source_url"] === null ? null : String(row["safe_source_url"]),
    discoveryType: String(row["discovery_type"]) as PageJobDiscovery["discoveryType"],
    sourceDepth: row["source_depth"] === null ? null : Number(row["source_depth"]),
    resultDepth: Number(row["result_depth"]),
    scopeDecisionId: String(row["scope_decision_id"]),
    discoveredAt: String(row["discovered_at"]),
  };
}

function rowToTransition(row: Row): PageJobTransition {
  return {
    transitionId: String(row["transition_id"]),
    jobId: String(row["job_id"]),
    fromState: row["recovery_from_state"] !== null && row["recovery_from_state"] !== undefined
      ? String(row["recovery_from_state"]) as PageJobState
      : row["from_state"] === null ? null : String(row["from_state"]) as PageJobState,
    toState: row["recovery_to_state"] !== null && row["recovery_to_state"] !== undefined
      ? String(row["recovery_to_state"]) as PageJobState
      : String(row["to_state"]) as PageJobState,
    reasonCode: String(row["reason_code"]),
    operationId: String(row["operation_id"]),
    correlationId: String(row["correlation_id"]),
    occurredAt: String(row["occurred_at"]),
  };
}

function rowToAttempt(row: Row): PageJobAttempt {
  return {
    attemptId: String(row["attempt_id"]),
    jobId: String(row["job_id"]),
    attemptNumber: Number(row["attempt_number"]),
    claimToken: String(row["claim_token"]),
    startedAt: String(row["started_at"]),
    finishedAt: row["finished_at"] === null ? null : String(row["finished_at"]),
    outcome: row["recovery_outcome"] !== null && row["recovery_outcome"] !== undefined
      ? String(row["recovery_outcome"]) as PageJobAttempt["outcome"]
      : String(row["outcome"]) as PageJobAttempt["outcome"],
    errorCode: row["error_code"] === null ? null : String(row["error_code"]),
    errorCategory: row["error_category"] === null ? null : String(row["error_category"]) as QueueFailureCategory,
    safeErrorMessage: row["safe_error_message"] === null ? null : String(row["safe_error_message"]),
  };
}

function blockedReasons(reasons: readonly string[]): boolean {
  return reasons.some((reason) => reason === "PROFILE_AUTHORIZATION_INCOMPLETE" || reason === "PRIVATE_NETWORK_NOT_ALLOWED" || reason.endsWith("_DENIED"));
}

export function createSqliteQueueRepository(database: DatabaseSync, options: SqliteQueueRepositoryOptions = {}): QueueRepositoryPort {
  const now = options.now ?? (() => new Date().toISOString());
  const id = options.id ?? randomUUID;
  const emit = options.onEvent ?? (() => undefined);

  const getJobRow = (projectId: string, runId: string, jobId: string): Row => {
    const row = database.prepare("SELECT * FROM page_jobs WHERE project_id = ? AND run_id = ? AND job_id = ?").get(projectId, runId, jobId) as Row | undefined;
    if (row === undefined) throw new QueueOperationError("QUEUE_JOB_NOT_FOUND", "The Page Job was not found in the selected Project and Run");
    return row;
  };

  const validateOwnership = (projectId: string, runId: string): void => {
    const project = database.prepare("SELECT project_id FROM project_metadata WHERE singleton_id = 1 AND project_id = ?").get(projectId);
    if (project === undefined) throw new QueueOperationError("QUEUE_PROJECT_NOT_OPEN", "The queue Project does not match the open Project");
    const run = database.prepare("SELECT run_id FROM runs WHERE run_id = ? AND project_id = ?").get(runId, projectId);
    if (run === undefined) throw new QueueOperationError("QUEUE_RUN_NOT_FOUND", "The selected Run does not belong to the Project");
  };

  const validateFencedClaim = (job: PageJob, claimToken: string): void => {
    if (job.fencingGeneration === 0) return;
    const lease = database.prepare(`
      SELECT lease_token_hash, fencing_generation, expires_at FROM job_leases
      WHERE job_id = ? AND project_id = ? AND run_id = ? AND status = 'active'
    `).get(job.jobId, job.projectId, job.runId) as { lease_token_hash: string; fencing_generation: number; expires_at: string } | undefined;
    const tokenHash = createHash("sha256").update(claimToken, "utf8").digest("hex");
    if (lease === undefined || lease.lease_token_hash !== tokenHash || lease.fencing_generation !== job.fencingGeneration || now() >= lease.expires_at) {
      throw new QueueOperationError("QUEUE_CLAIM_TOKEN_INVALID", "The active Lease and Fencing Generation do not authorize this operation");
    }
  };

  const transaction = <T>(operation: () => T): T => {
    try {
      database.exec("BEGIN IMMEDIATE");
      const result = operation();
      database.exec("COMMIT");
      return result;
    } catch (error) {
      if (database.isTransaction) database.exec("ROLLBACK");
      if (error instanceof QueueOperationError) throw error;
      emit("queue.transaction.failed", {});
      throw new QueueOperationError("QUEUE_TRANSACTION_FAILED", "The queue transaction failed safely", true);
    }
  };

  const idempotent = <T>(input: {
    projectId: string;
    runId: string;
    operationType: string;
    idempotencyKey: string;
    request: unknown;
  }, operation: () => T): T => {
    assertIdempotencyKey(input.idempotencyKey);
    const requestHash = hash(idempotencyRequest(input.request));
    const existing = database.prepare(`
      SELECT request_hash, result_json FROM queue_operations
      WHERE project_id = ? AND operation_type = ? AND idempotency_key = ?
    `).get(input.projectId, input.operationType, input.idempotencyKey) as { request_hash: string; result_json: string } | undefined;
    if (existing !== undefined) {
      if (existing.request_hash !== requestHash) {
        emit("queue.idempotency.conflict", { projectId: input.projectId, runId: input.runId, operationType: input.operationType });
        throw new QueueOperationError("QUEUE_OPERATION_IDEMPOTENCY_CONFLICT", "The idempotency key was already used for a different request");
      }
      return JSON.parse(existing.result_json) as T;
    }
    const result = operation();
    database.prepare(`
      INSERT INTO queue_operations
        (operation_record_id, project_id, run_id, operation_type, idempotency_key, request_hash, result_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id(), input.projectId, input.runId, input.operationType, input.idempotencyKey, requestHash, canonicalJson(result), now());
    return result;
  };

  const transition = (input: { jobId: string; from: PageJobState | null; to: PageJobState; reasonCode: string; operationId: string; correlationId: string; occurredAt: string; metadata?: unknown }): void => {
    if (input.from !== null) assertTransition(input.from, input.to);
    database.prepare(`
      INSERT INTO job_transitions
        (transition_id, job_id, from_state, to_state, reason_code, operation_id, correlation_id, occurred_at, safe_metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id(), input.jobId, input.from, input.to, input.reasonCode, input.operationId, input.correlationId, input.occurredAt, canonicalJson(input.metadata ?? {}));
  };

  const recordScopeDecision = (input: QueueEnqueueInput, timestamp: string): void => {
    const decision = input.scopeDecision;
    database.prepare(`
      INSERT OR IGNORE INTO scope_decisions
        (decision_id, project_id, run_id, profile_id, profile_revision_id, engine_version, eligible, should_queue,
         normalized_url, identity_url, identity_hash, safe_display_url, depth, reason_codes_json, matched_rule_ids_json, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      decision.decisionId, input.projectId, input.runId, decision.profileId, decision.profileRevisionId,
      decision.engineVersion, decision.eligible ? 1 : 0, decision.shouldQueue ? 1 : 0, decision.normalizedUrl,
      decision.identityUrl, decision.identityHash, decision.displayUrl, decision.depth,
      canonicalJson(decision.reasonCodes), canonicalJson(decision.matchedRuleIds), timestamp,
    );
  };

  const validateEnqueue = (input: QueueEnqueueInput): void => {
    validateOwnership(input.projectId, input.runId);
    assertAttemptPolicy(0, input.maxAttempts);
    if (input.requestedPriority !== undefined) assertPriority(input.requestedPriority);
    if (input.scopeDecision.depth < 0 || !Number.isInteger(input.scopeDecision.depth)) throw new QueueOperationError("QUEUE_INPUT_INVALID", "Scope depth is invalid");
    const profile = database.prepare(`
      SELECT sp.profile_id, spr.profile_revision_id, spr.canonical_json
      FROM site_profiles sp JOIN site_profile_revisions spr ON spr.profile_id = sp.profile_id
      WHERE sp.project_id = ? AND spr.profile_revision_id = ?
    `).get(input.projectId, input.scopeDecision.profileRevisionId) as { profile_id: string; profile_revision_id: string; canonical_json: string } | undefined;
    if (profile === undefined || profile.profile_id !== input.scopeDecision.profileId) {
      throw new QueueOperationError("QUEUE_PROFILE_REVISION_MISMATCH", "The Scope Decision Profile revision is not stored in the Project");
    }
    const storedEngine = Number((JSON.parse(profile.canonical_json) as { engineVersion?: unknown }).engineVersion);
    if (storedEngine !== input.scopeDecision.engineVersion) {
      throw new QueueOperationError("QUEUE_ENGINE_VERSION_MISMATCH", "The Scope Decision engine version does not match the Profile revision");
    }
    const revision = database.prepare("SELECT revision_id FROM project_revisions WHERE revision_id = ? AND project_id = ?").get(input.projectRevisionId, input.projectId);
    if (revision === undefined) throw new QueueOperationError("QUEUE_PROFILE_REVISION_MISMATCH", "The Project revision does not belong to the Project");
    if (input.sourceContext.parentJobId !== undefined && input.sourceContext.parentJobId !== null) getJobRow(input.projectId, input.runId, input.sourceContext.parentJobId);
  };

  const insertDiscovery = (input: QueueEnqueueInput, childJobId: string, timestamp: string): PageJobDiscovery => {
    const sourceDepth = input.sourceContext.sourceDepth ?? null;
    if (sourceDepth !== null && (!Number.isInteger(sourceDepth) || sourceDepth < 0)) throw new QueueOperationError("QUEUE_INPUT_INVALID", "Source depth is invalid");
    const safeSourceUrl = input.sourceContext.safeSourceUrl ?? null;
    if (safeSourceUrl !== null && safeSourceUrl.length > 8_192) throw new QueueOperationError("QUEUE_INPUT_INVALID", "Safe source URL exceeds the queue limit");
    const discoveryKey = hash({
      parentJobId: input.sourceContext.parentJobId ?? null,
      safeSourceUrl,
      discoveryType: input.sourceContext.discoveryType,
      sourceDepth,
      resultDepth: input.scopeDecision.depth,
      scopeDecisionId: input.scopeDecision.decisionId,
    });
    database.prepare(`
      INSERT OR IGNORE INTO job_discoveries
        (discovery_id, discovery_key, project_id, run_id, parent_job_id, child_job_id, safe_source_url, discovery_type,
         source_depth, result_depth, scope_decision_id, discovered_at, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}')
    `).run(id(), discoveryKey, input.projectId, input.runId, input.sourceContext.parentJobId ?? null, childJobId, safeSourceUrl, input.sourceContext.discoveryType, sourceDepth, input.scopeDecision.depth, input.scopeDecision.decisionId, timestamp);
    const row = database.prepare("SELECT * FROM job_discoveries WHERE child_job_id = ? AND discovery_key = ?").get(childJobId, discoveryKey) as Row;
    const discovery = rowToDiscovery(row);
    emit("queue.discovery.added", { projectId: input.projectId, runId: input.runId, jobId: childJobId, parentJobId: discovery.parentJobId, discoveryType: discovery.discoveryType, depth: discovery.resultDepth });
    return discovery;
  };

  const enqueueInTransaction = (input: QueueEnqueueInput): QueueEnqueueResult => {
    validateEnqueue(input);
    const timestamp = now();
    recordScopeDecision(input, timestamp);
    const decision = input.scopeDecision;
    if (!decision.eligible || !decision.shouldQueue || decision.identityHash === null || decision.identityUrl === null || decision.normalizedUrl === null || decision.displayUrl === null) {
      return { outcome: blockedReasons(decision.reasonCodes) ? "blocked" : "rejected", job: null, reasonCodes: decision.reasonCodes };
    }
    const existingRow = database.prepare(`
      SELECT * FROM page_jobs WHERE project_id = ? AND run_id = ? AND profile_revision_id = ?
        AND engine_version = ? AND identity_hash = ? AND job_type = 'page'
    `).get(input.projectId, input.runId, decision.profileRevisionId, decision.engineVersion, decision.identityHash) as Row | undefined;
    if (existingRow !== undefined) {
      const existing = rowToJob(existingRow);
      const depth = minimumDepth(existing.depth, decision.depth);
      if (depth !== existing.depth) database.prepare("UPDATE page_jobs SET depth = ?, updated_at = ? WHERE job_id = ?").run(depth, timestamp, existing.jobId);
      const discovery = insertDiscovery(input, existing.jobId, timestamp);
      const job = rowToJob(getJobRow(input.projectId, input.runId, existing.jobId));
      emit("queue.job.existing", { projectId: input.projectId, runId: input.runId, jobId: job.jobId, identityHash: job.identityHash, depth: job.depth });
      return { outcome: "existing", job, discovery, duplicateReason: "logical-identity" };
    }
    if (input.maxPages !== null) {
      if (!Number.isInteger(input.maxPages) || input.maxPages < 0) throw new QueueOperationError("QUEUE_INPUT_INVALID", "Maximum pages is invalid");
      const count = Number((database.prepare(`
        SELECT COUNT(*) AS count FROM page_jobs WHERE project_id = ? AND run_id = ? AND profile_revision_id = ? AND engine_version = ?
      `).get(input.projectId, input.runId, decision.profileRevisionId, decision.engineVersion) as { count: number }).count);
      if (count >= input.maxPages) return { outcome: "rejected", job: null, reasonCodes: ["PAGE_LIMIT_REACHED"] };
    }
    const priority = calculatePriority({ discoveryType: input.sourceContext.discoveryType, ...(input.requestedPriority === undefined ? {} : { requestedPriority: input.requestedPriority }) });
    const jobId = id();
    database.prepare(`
      INSERT INTO page_jobs
        (job_id, project_id, run_id, project_revision_id, profile_id, profile_revision_id, engine_version,
         job_type, normalized_url, identity_url, safe_display_url, identity_hash, scope_decision_id,
         scope_reason_code, state, priority, priority_source, depth, discovery_type, attempt_count,
         max_attempts, next_eligible_at, created_at, updated_at, queued_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'page', ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
    `).run(
      jobId, input.projectId, input.runId, input.projectRevisionId, decision.profileId, decision.profileRevisionId,
      decision.engineVersion, decision.normalizedUrl, decision.identityUrl, decision.displayUrl, decision.identityHash,
      decision.decisionId, decision.reasonCodes[0] ?? "URL_ACCEPTED", priority.priority, priority.source,
      decision.depth, input.sourceContext.discoveryType, input.maxAttempts, timestamp, timestamp, timestamp, timestamp,
    );
    transition({ jobId, from: null, to: "pending", reasonCode: "QUEUE_JOB_CREATED", operationId: input.operationId, correlationId: input.correlationId, occurredAt: timestamp, metadata: { priority: priority.priority, depth: decision.depth } });
    const discovery = insertDiscovery(input, jobId, timestamp);
    const job = rowToJob(getJobRow(input.projectId, input.runId, jobId));
    emit("queue.job.created", { projectId: input.projectId, runId: input.runId, jobId, identityHash: job.identityHash, profileRevisionId: job.profileRevisionId, engineVersion: job.normalizationEngineVersion, priority: job.priority, depth: job.depth });
    return { outcome: "created", job, discovery };
  };

  const terminalAction = (target: "skipped" | "blocked", input: { projectId: string; runId: string; jobId: string; reasonCode: string; safeMessage: string; claimToken?: string; idempotencyKey: string; operationId: string; correlationId: string }): PageJob => transaction(() => {
    validateOwnership(input.projectId, input.runId);
    return idempotent({ ...input, operationType: `queue.${target}`, request: input }, () => {
      const row = getJobRow(input.projectId, input.runId, input.jobId);
      const job = rowToJob(row);
      if (job.state !== "pending" && job.state !== "processing") throw new QueueOperationError("QUEUE_JOB_STATE_CONFLICT", `Only pending or processing Jobs may become ${target}`);
      if (job.state === "processing" && (input.claimToken === undefined || input.claimToken !== job.claimToken)) throw new QueueOperationError("QUEUE_CLAIM_TOKEN_INVALID", "The claim token does not own the processing Job");
      if (job.state === "processing") validateFencedClaim(job, input.claimToken!);
      const timestamp = now();
      const message = sanitizeSafeMessage(input.safeMessage);
      database.prepare(`
        UPDATE page_jobs SET state = ?, claim_token = NULL, claimed_by = NULL, updated_at = ?,
          last_error_code = ?, last_error_category = 'domain', last_error_message = ? WHERE job_id = ?
      `).run(target, timestamp, input.reasonCode, message, job.jobId);
      if (job.state === "processing") database.prepare(`
        UPDATE job_attempts SET finished_at = ?, outcome = ?, error_code = ?, error_category = 'domain', safe_error_message = ?
        WHERE job_id = ? AND claim_token = ? AND finished_at IS NULL
      `).run(timestamp, target, input.reasonCode, message, job.jobId, job.claimToken);
      if (job.state === "processing" && job.fencingGeneration > 0) database.prepare(`
        UPDATE job_leases SET status = 'released', released_at = ?, release_reason = ?, last_operation_id = ?
        WHERE job_id = ? AND fencing_generation = ? AND status = 'active'
      `).run(timestamp, `QUEUE_JOB_${target.toUpperCase()}`, input.operationId, job.jobId, job.fencingGeneration);
      transition({ jobId: job.jobId, from: job.state, to: target, reasonCode: input.reasonCode, operationId: input.operationId, correlationId: input.correlationId, occurredAt: timestamp });
      emit(`queue.job.${target}`, { projectId: input.projectId, runId: input.runId, jobId: job.jobId, reasonCode: input.reasonCode });
      return rowToJob(getJobRow(input.projectId, input.runId, job.jobId));
    });
  });

  const enqueueOne = async (input: QueueEnqueueInput): Promise<QueueEnqueueResult> => {
    emit("queue.enqueue.requested", { projectId: input.projectId, runId: input.runId, profileRevisionId: input.scopeDecision.profileRevisionId, engineVersion: input.scopeDecision.engineVersion });
    return transaction(() => idempotent({ projectId: input.projectId, runId: input.runId, operationType: "queue.enqueue", idempotencyKey: input.idempotencyKey, request: input }, () => enqueueInTransaction(input)));
  };

  return Object.freeze({
    enqueue: enqueueOne,

    async enqueueBatch(inputs) {
      if (inputs.length < 1 || inputs.length > QUEUE_LIMITS.batch) throw new QueueOperationError("QUEUE_BATCH_LIMIT_EXCEEDED", `Queue batch size must be from 1 to ${QUEUE_LIMITS.batch}`);
      const items: QueueBatchResult["items"][number][] = [];
      const counts = { created: 0, existing: 0, rejected: 0, blocked: 0, invalid: 0, failed: 0 };
      for (const input of inputs) {
        try {
          const result = await enqueueOne(input);
          items.push(result);
          counts[result.outcome] += 1;
        } catch (error) {
          const queueError = error instanceof QueueOperationError ? error : new QueueOperationError("QUEUE_PERSISTENCE_FAILURE", "The queue item failed safely");
          const outcome = queueError.code === "QUEUE_INPUT_INVALID" || queueError.code === "QUEUE_PROFILE_REVISION_MISMATCH" || queueError.code === "QUEUE_ENGINE_VERSION_MISMATCH" ? "invalid" : "failed";
          counts[outcome] += 1;
          items.push({ outcome, job: null, errorCode: queueError.code });
        }
      }
      emit("queue.batch.completed", { itemCount: items.length, ...counts });
      return { items, counts };
    },

    async hasIdentity(input) {
      validateOwnership(input.projectId, input.runId);
      return database.prepare(`
        SELECT job_id FROM page_jobs WHERE project_id = ? AND run_id = ? AND profile_revision_id = ?
          AND engine_version = ? AND identity_hash = ? AND job_type = 'page'
      `).get(input.projectId, input.runId, input.profileRevisionId, input.engineVersion, input.identityHash) !== undefined;
    },

    async countIdentities(input) {
      validateOwnership(input.projectId, input.runId);
      return Number((database.prepare(`
        SELECT COUNT(*) AS count FROM page_jobs WHERE project_id = ? AND run_id = ? AND profile_revision_id = ? AND engine_version = ?
      `).get(input.projectId, input.runId, input.profileRevisionId, input.engineVersion) as { count: number }).count);
    },

    async claimNext(input) {
      emit("queue.claim.requested", { projectId: input.projectId, runId: input.runId, claimedBy: input.claimedBy });
      return transaction(() => {
        validateOwnership(input.projectId, input.runId);
        return idempotent({ ...input, operationType: "queue.claimNext", request: input }, () => {
          const timestamp = now();
          const row = database.prepare(`
            SELECT * FROM page_jobs WHERE project_id = ? AND run_id = ? AND state = 'pending' AND next_eligible_at <= ?
            ORDER BY priority DESC, next_eligible_at ASC, depth ASC, queue_sequence ASC, job_id ASC LIMIT 1
          `).get(input.projectId, input.runId, timestamp) as Row | undefined;
          if (row === undefined) return null;
          const job = rowToJob(row);
          if (job.attemptCount >= job.maxAttempts) throw new QueueOperationError("QUEUE_MAX_ATTEMPTS_REACHED", "The selected Job has exhausted its attempts");
          const claimToken = id();
          const attemptNumber = job.attemptCount + 1;
          const result = database.prepare(`
            UPDATE page_jobs SET state = 'processing', claim_token = ?, claimed_by = ?, claimed_at = ?,
              last_attempt_at = ?, attempt_count = ?, updated_at = ? WHERE job_id = ? AND state = 'pending'
          `).run(claimToken, input.claimedBy, timestamp, timestamp, attemptNumber, timestamp, job.jobId);
          if (result.changes !== 1) throw new QueueOperationError("QUEUE_CLAIM_CONFLICT", "Another caller claimed the Page Job");
          database.prepare(`
            INSERT INTO job_attempts (attempt_id, job_id, attempt_number, claim_token, started_at, outcome, metadata_json)
            VALUES (?, ?, ?, ?, ?, 'processing', '{}')
          `).run(id(), job.jobId, attemptNumber, claimToken, timestamp);
          transition({ jobId: job.jobId, from: "pending", to: "processing", reasonCode: "QUEUE_JOB_CLAIMED", operationId: input.operationId, correlationId: input.correlationId, occurredAt: timestamp, metadata: { attemptNumber } });
          emit("queue.job.claimed", { projectId: input.projectId, runId: input.runId, jobId: job.jobId, attemptNumber, claimedBy: input.claimedBy });
          return rowToJob(getJobRow(input.projectId, input.runId, job.jobId));
        });
      });
    },

    async complete(input) {
      emit("queue.completion.requested", { projectId: input.projectId, runId: input.runId, jobId: input.jobId });
      return transaction(() => {
        validateOwnership(input.projectId, input.runId);
        assertIdempotencyKey(input.completionKey, "completionKey");
        assertUtcTimestamp(input.completedAt, "completedAt");
        validateResultSummary(input.resultSummary);
        return idempotent({ ...input, operationType: "queue.complete", request: input }, () => {
          const row = getJobRow(input.projectId, input.runId, input.jobId);
          const job = rowToJob(row);
          const resultJson = canonicalJson(input.resultSummary);
          if (job.state === "completed") {
            const completedAttempt = database.prepare("SELECT claim_token FROM job_attempts WHERE job_id = ? AND outcome = 'completed' ORDER BY attempt_number DESC LIMIT 1").get(job.jobId) as { claim_token: string } | undefined;
            if (job.completionKey === input.completionKey && canonicalJson(job.resultSummary) === resultJson && completedAttempt?.claim_token === input.claimToken) return job;
            throw new QueueOperationError("QUEUE_COMPLETION_CONFLICT", "The Page Job already has a different completion result");
          }
          if (job.state !== "processing") throw new QueueOperationError("QUEUE_JOB_STATE_CONFLICT", "Only a processing Page Job may complete");
          if (job.claimToken !== input.claimToken) throw new QueueOperationError("QUEUE_CLAIM_TOKEN_INVALID", "The completion claim token is invalid");
          validateFencedClaim(job, input.claimToken);
          database.prepare(`
            UPDATE page_jobs SET state = 'completed', claim_token = NULL, claimed_by = NULL, completed_at = ?,
              completion_key = ?, result_version = 1, result_summary_json = ?, updated_at = ? WHERE job_id = ?
          `).run(input.completedAt, input.completionKey, resultJson, input.completedAt, job.jobId);
          database.prepare(`
            UPDATE job_attempts SET finished_at = ?, outcome = 'completed', metadata_json = ?
            WHERE job_id = ? AND claim_token = ? AND finished_at IS NULL
          `).run(input.completedAt, canonicalJson({ resultVersion: 1 }), job.jobId, input.claimToken);
          if (job.fencingGeneration > 0) database.prepare(`
            UPDATE job_leases SET status = 'released', released_at = ?, release_reason = 'QUEUE_JOB_COMPLETED', last_operation_id = ?
            WHERE job_id = ? AND fencing_generation = ? AND status = 'active'
          `).run(input.completedAt, input.operationId, job.jobId, job.fencingGeneration);
          transition({ jobId: job.jobId, from: "processing", to: "completed", reasonCode: "QUEUE_JOB_COMPLETED", operationId: input.operationId, correlationId: input.correlationId, occurredAt: input.completedAt, metadata: { resultVersion: 1 } });
          emit("queue.job.completed", { projectId: input.projectId, runId: input.runId, jobId: job.jobId, attemptNumber: job.attemptCount });
          return rowToJob(getJobRow(input.projectId, input.runId, job.jobId));
        });
      });
    },

    async fail(input) {
      emit("queue.failure.requested", { projectId: input.projectId, runId: input.runId, jobId: input.jobId, failureCode: input.failureCode, retryable: input.retryable });
      return transaction(() => {
        validateOwnership(input.projectId, input.runId);
        assertIdempotencyKey(input.failureKey, "failureKey");
        assertUtcTimestamp(input.failedAt, "failedAt");
        if (input.nextEligibleAt !== undefined) assertUtcTimestamp(input.nextEligibleAt, "nextEligibleAt");
        return idempotent({ ...input, operationType: "queue.fail", request: input }, () => {
          const row = getJobRow(input.projectId, input.runId, input.jobId);
          const job = rowToJob(row);
          if (job.state !== "processing") throw new QueueOperationError("QUEUE_JOB_STATE_CONFLICT", "Only a processing Page Job may fail");
          if (job.claimToken !== input.claimToken) throw new QueueOperationError("QUEUE_CLAIM_TOKEN_INVALID", "The failure claim token is invalid");
          validateFencedClaim(job, input.claimToken);
          const retry = shouldRetry(job.attemptCount, job.maxAttempts, input.retryable);
          if (retry && input.nextEligibleAt === undefined) throw new QueueOperationError("QUEUE_INPUT_INVALID", "A retryable failure requires nextEligibleAt");
          const target = retry ? "retrying" : "failed";
          const nextEligibleAt = retry ? input.nextEligibleAt! : input.failedAt;
          const safeMessage = sanitizeSafeMessage(input.safeMessage);
          database.prepare(`
            UPDATE page_jobs SET state = ?, claim_token = NULL, claimed_by = NULL, failed_at = ?, next_eligible_at = ?,
              last_error_code = ?, last_error_category = ?, last_error_message = ?, updated_at = ? WHERE job_id = ?
          `).run(target, retry ? null : input.failedAt, nextEligibleAt, input.failureCode, input.failureCategory, safeMessage, input.failedAt, job.jobId);
          database.prepare(`
            UPDATE job_attempts SET finished_at = ?, outcome = ?, error_code = ?, error_category = ?, safe_error_message = ?, metadata_json = ?
            WHERE job_id = ? AND claim_token = ? AND finished_at IS NULL
          `).run(input.failedAt, target, input.failureCode, input.failureCategory, safeMessage, canonicalJson({ failureKey: input.failureKey, retryable: input.retryable }), job.jobId, input.claimToken);
          if (job.fencingGeneration > 0) database.prepare(`
            UPDATE job_leases SET status = 'released', released_at = ?, release_reason = ?, last_operation_id = ?
            WHERE job_id = ? AND fencing_generation = ? AND status = 'active'
          `).run(input.failedAt, retry ? 'QUEUE_JOB_RETRYING' : 'QUEUE_JOB_FAILED', input.operationId, job.jobId, job.fencingGeneration);
          transition({ jobId: job.jobId, from: "processing", to: target, reasonCode: input.failureCode, operationId: input.operationId, correlationId: input.correlationId, occurredAt: input.failedAt, metadata: { retryable: input.retryable, attemptNumber: job.attemptCount } });
          emit(retry ? "queue.job.retry-scheduled" : "queue.job.failed", { projectId: input.projectId, runId: input.runId, jobId: job.jobId, reasonCode: input.failureCode, attemptNumber: job.attemptCount });
          return rowToJob(getJobRow(input.projectId, input.runId, job.jobId));
        });
      });
    },

    async scheduleRetry(input) {
      return transaction(() => {
        validateOwnership(input.projectId, input.runId);
        assertUtcTimestamp(input.nextEligibleAt, "nextEligibleAt");
        return idempotent({ ...input, operationType: "queue.scheduleRetry", request: input }, () => {
          const job = rowToJob(getJobRow(input.projectId, input.runId, input.jobId));
          if (job.state !== "retrying") throw new QueueOperationError("QUEUE_RETRY_NOT_ALLOWED", "Only a retrying Page Job can be scheduled");
          if (job.attemptCount >= job.maxAttempts) throw new QueueOperationError("QUEUE_MAX_ATTEMPTS_REACHED", "The Page Job has no remaining attempts");
          const timestamp = now();
          database.prepare("UPDATE page_jobs SET next_eligible_at = ?, updated_at = ? WHERE job_id = ?").run(input.nextEligibleAt, timestamp, job.jobId);
          emit("queue.job.retry-scheduled", { projectId: input.projectId, runId: input.runId, jobId: job.jobId, reasonCode: input.reasonCode, attemptNumber: job.attemptCount });
          return rowToJob(getJobRow(input.projectId, input.runId, job.jobId));
        });
      });
    },

    async releaseDueRetries(input) {
      return transaction(() => {
        validateOwnership(input.projectId, input.runId);
        assertUtcTimestamp(input.dueAt, "dueAt");
        if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > QUEUE_LIMITS.retryRelease) throw new QueueOperationError("QUEUE_PAGINATION_LIMIT_EXCEEDED", "Retry release limit is invalid");
        return idempotent({ ...input, operationType: "queue.releaseDueRetries", request: input }, () => {
          const rows = database.prepare(`
            SELECT * FROM page_jobs WHERE project_id = ? AND run_id = ? AND state = 'retrying'
              AND next_eligible_at <= ? AND attempt_count < max_attempts
            ORDER BY next_eligible_at ASC, queue_sequence ASC, job_id ASC LIMIT ?
          `).all(input.projectId, input.runId, input.dueAt, input.limit) as unknown as Row[];
          const jobs: PageJob[] = [];
          for (const row of rows) {
            const job = rowToJob(row);
            database.prepare("UPDATE page_jobs SET state = 'pending', updated_at = ? WHERE job_id = ? AND state = 'retrying'").run(input.dueAt, job.jobId);
            transition({ jobId: job.jobId, from: "retrying", to: "pending", reasonCode: "QUEUE_RETRY_RELEASED", operationId: input.operationId, correlationId: input.correlationId, occurredAt: input.dueAt });
            jobs.push(rowToJob(getJobRow(input.projectId, input.runId, job.jobId)));
            emit("queue.job.retry-released", { projectId: input.projectId, runId: input.runId, jobId: job.jobId, attemptNumber: job.attemptCount });
          }
          return jobs;
        });
      });
    },

    async skip(input) {
      return terminalAction("skipped", input);
    },

    async block(input) {
      return terminalAction("blocked", input);
    },

    async get(input) {
      validateOwnership(input.projectId, input.runId);
      return rowToJob(getJobRow(input.projectId, input.runId, input.jobId));
    },

    async list(input) {
      validateOwnership(input.projectId, input.runId);
      if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > QUEUE_LIMITS.list) throw new QueueOperationError("QUEUE_PAGINATION_LIMIT_EXCEEDED", "Queue list limit is invalid");
      const after = input.afterSequence ?? 0;
      if (!Number.isInteger(after) || after < 0) throw new QueueOperationError("QUEUE_INPUT_INVALID", "Queue cursor is invalid");
      const rows = input.state === undefined
        ? database.prepare("SELECT * FROM page_jobs WHERE project_id = ? AND run_id = ? AND queue_sequence > ? ORDER BY queue_sequence ASC LIMIT ?").all(input.projectId, input.runId, after, input.limit + 1) as unknown as Row[]
        : input.state === "interrupted" || input.state === "paused"
          ? database.prepare("SELECT * FROM page_jobs WHERE project_id = ? AND run_id = ? AND recovery_state = ? AND queue_sequence > ? ORDER BY queue_sequence ASC LIMIT ?").all(input.projectId, input.runId, input.state, after, input.limit + 1) as unknown as Row[]
          : database.prepare("SELECT * FROM page_jobs WHERE project_id = ? AND run_id = ? AND state = ? AND recovery_state IS NULL AND queue_sequence > ? ORDER BY queue_sequence ASC LIMIT ?").all(input.projectId, input.runId, input.state, after, input.limit + 1) as unknown as Row[];
      const hasMore = rows.length > input.limit;
      const jobs = rows.slice(0, input.limit).map(rowToJob);
      return { jobs, nextCursor: hasMore ? jobs.at(-1)?.queueSequence ?? null : null } satisfies QueueListResult;
    },

    async getStatistics(input) {
      validateOwnership(input.projectId, input.runId);
      assertUtcTimestamp(input.asOf, "asOf");
      const aggregate = database.prepare(`
        SELECT COUNT(*) AS total,
          SUM(CASE WHEN state = 'pending' THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN state = 'processing' AND recovery_state IS NULL THEN 1 ELSE 0 END) AS processing,
          SUM(CASE WHEN state = 'completed' THEN 1 ELSE 0 END) AS completed,
          SUM(CASE WHEN state = 'failed' THEN 1 ELSE 0 END) AS failed,
          SUM(CASE WHEN state = 'retrying' THEN 1 ELSE 0 END) AS retrying,
          SUM(CASE WHEN state = 'skipped' THEN 1 ELSE 0 END) AS skipped,
          SUM(CASE WHEN state = 'blocked' THEN 1 ELSE 0 END) AS blocked,
          SUM(CASE WHEN recovery_state = 'interrupted' THEN 1 ELSE 0 END) AS interrupted,
          SUM(CASE WHEN recovery_state = 'paused' THEN 1 ELSE 0 END) AS paused,
          SUM(CASE WHEN state = 'retrying' AND next_eligible_at <= ? THEN 1 ELSE 0 END) AS due_retries,
          SUM(CASE WHEN state = 'failed' AND attempt_count >= max_attempts THEN 1 ELSE 0 END) AS exhausted_retries,
          MAX(depth) AS maximum_depth, AVG(depth) AS average_depth,
          MIN(CASE WHEN state = 'pending' THEN queued_at END) AS oldest_pending_at,
          MAX(created_at) AS newest_job_at
        FROM page_jobs WHERE project_id = ? AND run_id = ?
      `).get(input.asOf, input.projectId, input.runId) as Row;
      const discoveryCount = Number((database.prepare(`
        SELECT COUNT(*) AS count FROM job_discoveries jd JOIN page_jobs pj ON pj.job_id = jd.child_job_id
        WHERE pj.project_id = ? AND pj.run_id = ?
      `).get(input.projectId, input.runId) as { count: number }).count);
      const total = Number(aggregate["total"] ?? 0);
      const result: QueueStatistics = {
        total,
        pending: Number(aggregate["pending"] ?? 0),
        processing: Number(aggregate["processing"] ?? 0),
        completed: Number(aggregate["completed"] ?? 0),
        failed: Number(aggregate["failed"] ?? 0),
        retrying: Number(aggregate["retrying"] ?? 0),
        skipped: Number(aggregate["skipped"] ?? 0),
        blocked: Number(aggregate["blocked"] ?? 0),
        interrupted: Number(aggregate["interrupted"] ?? 0),
        paused: Number(aggregate["paused"] ?? 0),
        dueRetries: Number(aggregate["due_retries"] ?? 0),
        exhaustedRetries: Number(aggregate["exhausted_retries"] ?? 0),
        maximumDepth: aggregate["maximum_depth"] === null ? null : Number(aggregate["maximum_depth"]),
        averageDepth: aggregate["average_depth"] === null ? null : Number(aggregate["average_depth"]),
        oldestPendingAt: aggregate["oldest_pending_at"] === null ? null : String(aggregate["oldest_pending_at"]),
        newestJobAt: aggregate["newest_job_at"] === null ? null : String(aggregate["newest_job_at"]),
        duplicateDiscoveries: Math.max(0, discoveryCount - total),
      };
      emit("queue.statistics.generated", { projectId: input.projectId, runId: input.runId, total: result.total, pending: result.pending, processing: result.processing });
      return result;
    },

    async getHistory(input) {
      validateOwnership(input.projectId, input.runId);
      const job = rowToJob(getJobRow(input.projectId, input.runId, input.jobId));
      const transitions = (database.prepare("SELECT * FROM job_transitions WHERE job_id = ? ORDER BY transition_sequence").all(job.jobId) as unknown as Row[]).map(rowToTransition);
      const attempts = (database.prepare("SELECT * FROM job_attempts WHERE job_id = ? ORDER BY attempt_number").all(job.jobId) as unknown as Row[]).map(rowToAttempt);
      const discoveries = (database.prepare("SELECT * FROM job_discoveries WHERE child_job_id = ? ORDER BY discovery_sequence").all(job.jobId) as unknown as Row[]).map(rowToDiscovery);
      return { job, transitions, attempts, discoveries } satisfies QueueHistory;
    },

    async clearPending(input) {
      if (input.confirmation !== "CLEAR-PENDING-QUEUE") throw new QueueOperationError("QUEUE_CLEAR_NOT_ALLOWED", "The queue-clear confirmation is invalid");
      return transaction(() => {
        validateOwnership(input.projectId, input.runId);
        return idempotent({ ...input, operationType: "queue.clearPending", request: input }, () => {
          const timestamp = now();
          const rows = database.prepare("SELECT job_id FROM page_jobs WHERE project_id = ? AND run_id = ? AND state = 'pending' ORDER BY queue_sequence").all(input.projectId, input.runId) as unknown as { job_id: string }[];
          for (const row of rows) {
            database.prepare(`
              UPDATE page_jobs SET state = 'skipped', last_error_code = ?, last_error_category = 'domain',
                last_error_message = 'Pending queue cleared by explicit local operation.', updated_at = ?
              WHERE job_id = ? AND state = 'pending'
            `).run(input.reasonCode, timestamp, row.job_id);
            transition({ jobId: row.job_id, from: "pending", to: "skipped", reasonCode: input.reasonCode, operationId: input.operationId, correlationId: input.correlationId, occurredAt: timestamp });
          }
          return { skipped: rows.length };
        });
      });
    },
  } satisfies QueueRepositoryPort);
}
