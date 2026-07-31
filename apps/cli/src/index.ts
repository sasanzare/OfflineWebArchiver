#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createApplicationService, type ApplicationService } from "@offline-web-archive/application-service";
import {
  createProjectCommand,
  createSystemDescribeCommand,
  ContractValidationError,
  parseResponseEnvelope,
  type ErrorContract,
  type ResponseEnvelope,
  type SuccessResponseEnvelope,
} from "@offline-web-archive/contracts";
import { createDevelopmentLogger } from "@offline-web-archive/observability";
import { readEnvironmentConfiguration, readRuntimePlatformInfo } from "@offline-web-archive/platform";

export const CLI_VERSION = "0.6.0";

export const CLI_EXIT_CODES = Object.freeze({
  success: 0,
  usage: 2,
  contract: 3,
  validation: 4,
  application: 5,
  internal: 70,
});

export const CLI_HELP = `Offline Web Archive Builder CLI

Usage:
  offline-archive system describe [--json]
  offline-archive project create <directory> --name <name> --slug <slug> [--base-url <url>] [--json]
  offline-archive project open <directory> [--json]
  offline-archive project validate <directory> [--json]
  offline-archive project export <directory> <archive.zip> [--json]
  offline-archive project import <archive.zip> <directory> [--json]
  offline-archive project info [directory] [--json]
  offline-archive profile create <project> --name <name> --seed <url> [--json]
  offline-archive profile show <project> [--json]
  offline-archive profile validate <project> [--json]
  offline-archive profile update <project> <config.json> [--json]
  offline-archive profile compare <project> <from-sequence> <to-sequence> [--json]
  offline-archive scope evaluate <project> <url> [--source <url>] [--base <url>] [--source-depth <n>] [--discovery-type <type>] [--profile-revision <uuid>] [--count <n>] [--json]
  offline-archive scope explain <project> <url> [--source <url>] [--base <url>] [--profile-revision <uuid>] [--json]
  offline-archive scope normalize <project> <url> [--source <url>] [--base <url>] [--profile-revision <uuid>] [--json]
  offline-archive scope engine-info [--json]
  offline-archive queue enqueue <project> <url> --run <uuid> --profile-revision <uuid> --idempotency-key <key> [--source <url>] [--source-depth <n>] [--discovery-type <type>] [--priority <n>] [--max-attempts <n>] [--json]
  offline-archive queue enqueue-batch <project> <items.json> --run <uuid> --profile-revision <uuid> --idempotency-key <key> [--json]
  offline-archive queue list <project> --run <uuid> [--state <state>] [--after <sequence>] [--limit <n>] [--json]
  offline-archive queue show <project> <job-id> --run <uuid> [--json]
  offline-archive queue claim-next <project> --run <uuid> --claimed-by <name> --idempotency-key <key> [--json]
  offline-archive queue complete <project> <job-id> --run <uuid> --claim-token <uuid> --completion-key <key> --idempotency-key <key> [--status-code <n>] [--json]
  offline-archive queue fail <project> <job-id> --run <uuid> --claim-token <uuid> --failure-key <key> --failure-code <code> --failure-category <category> --message <safe-message> --idempotency-key <key> [--retryable --next-eligible-at <utc>] [--json]
  offline-archive queue retry <project> <job-id> --run <uuid> --next-eligible-at <utc> --reason <code> --idempotency-key <key> [--json]
  offline-archive queue release-due <project> --run <uuid> --due-at <utc> --limit <n> --idempotency-key <key> [--json]
  offline-archive queue skip|block <project> <job-id> --run <uuid> --reason <code> --message <safe-message> --idempotency-key <key> [--claim-token <uuid>] [--json]
  offline-archive queue stats <project> --run <uuid> [--json]
  offline-archive queue history <project> <job-id> --run <uuid> [--json]
  offline-archive queue clear-pending <project> --run <uuid> --reason <code> --idempotency-key <key> --confirm CLEAR-PENDING-QUEUE [--json]
  offline-archive --help
  offline-archive --version

Project and queue commands are local-only. Queue completion/failure actions are architecture-test simulations; this phase does not crawl or contact a website.
`;

export interface CliIo {
  stdout(value: string): void;
  stderr(value: string): void;
}

export type ParsedArguments =
  | { kind: "help" }
  | { kind: "version" }
  | { kind: "describe"; json: boolean }
  | { kind: "project"; operation: "create"; json: boolean; payload: { destinationPath: string; name: string; slug: string; baseUrl?: string } }
  | { kind: "project"; operation: "open" | "validate"; json: boolean; payload: { projectPath: string } }
  | { kind: "project"; operation: "export"; json: boolean; payload: { projectPath: string; archivePath: string } }
  | { kind: "project"; operation: "import"; json: boolean; payload: { archivePath: string; destinationPath: string } }
  | { kind: "project"; operation: "info"; json: boolean; payload: { projectPath?: string } }
  | { kind: "profile"; operation: "create"; json: boolean; payload: { projectPath: string; name: string; seedUrl: string } }
  | { kind: "profile"; operation: "get" | "validate"; json: boolean; payload: { projectPath: string } }
  | { kind: "profile"; operation: "update"; json: boolean; payload: { projectPath: string; configPath: string } }
  | { kind: "profile"; operation: "compare"; json: boolean; payload: { projectPath: string; fromSequence: number; toSequence: number } }
  | { kind: "scope"; operation: "evaluate" | "explain" | "previewNormalization"; json: boolean; payload: { projectPath: string; input: { rawUrl: string; sourceUrl?: string; baseUrl?: string; sourceDepth?: number; discoveryType?: string; profileRevision?: string; currentEligibleCount?: number } } }
  | { kind: "scope"; operation: "getEngineInfo"; json: boolean; payload: {} }
  | { kind: "queue"; operation: "enqueue" | "enqueueBatch" | "claimNext" | "complete" | "fail" | "scheduleRetry" | "releaseDueRetries" | "skip" | "block" | "get" | "list" | "getStatistics" | "getHistory" | "clearPending"; json: boolean; payload: Record<string, unknown>; batchPath?: string }
  | { kind: "invalid"; message: string };

function invalid(message: string): ParsedArguments {
  return { kind: "invalid", message: `${message} Run offline-archive --help for usage.` };
}

function optionValue(arguments_: readonly string[], name: string): string | undefined {
  const index = arguments_.indexOf(name);
  if (index < 0) return undefined;
  const value = arguments_[index + 1];
  return value !== undefined && !value.startsWith("--") ? value : undefined;
}

export function parseCliArguments(arguments_: readonly string[]): ParsedArguments {
  if (arguments_.length === 0 || arguments_.includes("--help") || arguments_.includes("-h")) return { kind: "help" };
  if (arguments_.length === 1 && (arguments_[0] === "--version" || arguments_[0] === "-v")) return { kind: "version" };
  const json = arguments_.includes("--json");
  const valueOptions = [
    "--name", "--slug", "--base-url", "--seed", "--base", "--source", "--depth", "--source-depth", "--discovery-type", "--profile-revision", "--count",
    "--run", "--idempotency-key", "--priority", "--max-attempts", "--state", "--after", "--limit", "--claimed-by", "--claim-token", "--completion-key", "--status-code",
    "--failure-key", "--failure-code", "--failure-category", "--message", "--next-eligible-at", "--reason", "--due-at", "--confirm",
  ];
  const filtered = arguments_.filter((argument, index) => {
    if (argument === "--json" || argument === "--retryable") return false;
    if (valueOptions.includes(arguments_[index - 1] ?? "")) return false;
    return !valueOptions.includes(argument);
  });
  if (filtered.length === 2 && filtered[0] === "system" && filtered[1] === "describe") return { kind: "describe", json };
  if (filtered[0] === "profile" && filtered[1] !== undefined) {
    const operation = filtered[1];
    if (operation === "create" && filtered.length === 3) {
      const name = optionValue(arguments_, "--name"); const seedUrl = optionValue(arguments_, "--seed");
      return name === undefined || seedUrl === undefined ? invalid("Profile create requires --name and --seed.") : { kind: "profile", operation: "create", json, payload: { projectPath: filtered[2]!, name, seedUrl } };
    }
    if ((operation === "show" || operation === "validate") && filtered.length === 3) return { kind: "profile", operation: operation === "show" ? "get" : "validate", json, payload: { projectPath: filtered[2]! } };
    if (operation === "update" && filtered.length === 4) return { kind: "profile", operation: "update", json, payload: { projectPath: filtered[2]!, configPath: filtered[3]! } };
    if (operation === "compare" && filtered.length === 5 && /^\d+$/.test(filtered[3]!) && /^\d+$/.test(filtered[4]!)) return { kind: "profile", operation: "compare", json, payload: { projectPath: filtered[2]!, fromSequence: Number(filtered[3]), toSequence: Number(filtered[4]) } };
    return invalid(`Invalid profile ${operation} arguments.`);
  }
  if (filtered[0] === "scope" && filtered[1] !== undefined) {
    const operation = filtered[1];
    if (operation === "engine-info" && filtered.length === 2) return { kind: "scope", operation: "getEngineInfo", json, payload: {} };
    if (["evaluate", "explain", "normalize"].includes(operation) && filtered.length === 4) {
      const sourceUrl = optionValue(arguments_, "--source"); const baseUrl = optionValue(arguments_, "--base"); const depthValue = optionValue(arguments_, "--source-depth") ?? optionValue(arguments_, "--depth"); const discoveryType = optionValue(arguments_, "--discovery-type"); const profileRevision = optionValue(arguments_, "--profile-revision"); const countValue = optionValue(arguments_, "--count");
      if ((depthValue !== undefined && !/^\d+$/.test(depthValue)) || (countValue !== undefined && !/^\d+$/.test(countValue))) return invalid("Depth and count must be non-negative integers.");
      return { kind: "scope", operation: operation === "normalize" ? "previewNormalization" : operation as "evaluate" | "explain", json, payload: { projectPath: filtered[2]!, input: { rawUrl: filtered[3]!, ...(sourceUrl === undefined ? {} : { sourceUrl }), ...(baseUrl === undefined ? {} : { baseUrl }), ...(depthValue === undefined ? {} : { sourceDepth: Number(depthValue) }), ...(discoveryType === undefined ? {} : { discoveryType }), ...(profileRevision === undefined ? {} : { profileRevision }), ...(countValue === undefined ? {} : { currentEligibleCount: Number(countValue) }) } } };
    }
    return invalid(`Invalid scope ${operation} arguments.`);
  }
  if (filtered[0] === "queue" && filtered[1] !== undefined) {
    const operation = filtered[1];
    const projectPath = filtered[2];
    const runId = optionValue(arguments_, "--run");
    if (projectPath === undefined || runId === undefined) return invalid(`Queue ${operation} requires a Project and --run.`);
    const mutation = (payload: Record<string, unknown>, commandOperation: Extract<ParsedArguments, { kind: "queue" }>["operation"]): ParsedArguments => {
      const idempotencyKey = optionValue(arguments_, "--idempotency-key");
      return idempotencyKey === undefined
        ? invalid(`Queue ${operation} requires --idempotency-key.`)
        : { kind: "queue", operation: commandOperation, json, payload: { projectPath, runId, idempotencyKey, ...payload } };
    };
    const integer = (name: string, fallback?: number): number | undefined => {
      const value = optionValue(arguments_, name);
      if (value === undefined) return fallback;
      return /^\d+$/.test(value) ? Number(value) : undefined;
    };
    if (operation === "enqueue" && filtered.length === 4) {
      const profileRevision = optionValue(arguments_, "--profile-revision");
      const priority = integer("--priority");
      const maxAttempts = integer("--max-attempts", 3);
      if (profileRevision === undefined || maxAttempts === undefined || (optionValue(arguments_, "--priority") !== undefined && priority === undefined)) return invalid("Queue enqueue requires a valid --profile-revision and numeric limits.");
      const sourceUrl = optionValue(arguments_, "--source");
      const sourceDepth = integer("--source-depth");
      if (optionValue(arguments_, "--source-depth") !== undefined && sourceDepth === undefined) return invalid("Queue source depth must be a non-negative integer.");
      return mutation({ profileRevision, url: filtered[3]!, discoveryType: optionValue(arguments_, "--discovery-type") ?? "manual", maxAttempts, ...(sourceUrl === undefined ? {} : { sourceUrl }), ...(sourceDepth === undefined ? {} : { sourceDepth }), ...(priority === undefined ? {} : { requestedPriority: priority }) }, "enqueue");
    }
    if (operation === "enqueue-batch" && filtered.length === 4) {
      const profileRevision = optionValue(arguments_, "--profile-revision");
      const idempotencyKey = optionValue(arguments_, "--idempotency-key");
      return profileRevision === undefined || idempotencyKey === undefined
        ? invalid("Queue enqueue-batch requires --profile-revision and --idempotency-key.")
        : { kind: "queue", operation: "enqueueBatch", json, payload: { projectPath, runId, profileRevision, idempotencyKey }, batchPath: filtered[3]! };
    }
    if (operation === "list" && filtered.length === 3) {
      const limit = integer("--limit", 50); const afterSequence = integer("--after"); const state = optionValue(arguments_, "--state");
      if (limit === undefined || (optionValue(arguments_, "--after") !== undefined && afterSequence === undefined)) return invalid("Queue list pagination values must be non-negative integers.");
      return { kind: "queue", operation: "list", json, payload: { projectPath, runId, limit, ...(afterSequence === undefined ? {} : { afterSequence }), ...(state === undefined ? {} : { state }) } };
    }
    if (operation === "show" && filtered.length === 4) return { kind: "queue", operation: "get", json, payload: { projectPath, runId, jobId: filtered[3]! } };
    if (operation === "stats" && filtered.length === 3) return { kind: "queue", operation: "getStatistics", json, payload: { projectPath, runId } };
    if (operation === "history" && filtered.length === 4) return { kind: "queue", operation: "getHistory", json, payload: { projectPath, runId, jobId: filtered[3]! } };
    if (operation === "claim-next" && filtered.length === 3) {
      const claimedBy = optionValue(arguments_, "--claimed-by");
      return claimedBy === undefined ? invalid("Queue claim-next requires --claimed-by.") : mutation({ claimedBy }, "claimNext");
    }
    if (operation === "complete" && filtered.length === 4) {
      const claimToken = optionValue(arguments_, "--claim-token"); const completionKey = optionValue(arguments_, "--completion-key"); const statusCode = integer("--status-code");
      if (claimToken === undefined || completionKey === undefined || (optionValue(arguments_, "--status-code") !== undefined && statusCode === undefined)) return invalid("Queue complete requires a claim token, completion key, and valid optional status code.");
      return mutation({ jobId: filtered[3]!, claimToken, completionKey, completedAt: new Date().toISOString(), resultSummary: { resultType: "queue-test", statusCode: statusCode ?? null, contentStored: false } }, "complete");
    }
    if (operation === "fail" && filtered.length === 4) {
      const claimToken = optionValue(arguments_, "--claim-token"); const failureKey = optionValue(arguments_, "--failure-key"); const failureCode = optionValue(arguments_, "--failure-code"); const failureCategory = optionValue(arguments_, "--failure-category"); const safeMessage = optionValue(arguments_, "--message"); const nextEligibleAt = optionValue(arguments_, "--next-eligible-at"); const retryable = arguments_.includes("--retryable");
      if ([claimToken, failureKey, failureCode, failureCategory, safeMessage].some((value) => value === undefined) || (retryable && nextEligibleAt === undefined)) return invalid("Queue fail is missing failure details or retry time.");
      return mutation({ jobId: filtered[3]!, claimToken, failureKey, failureCode, failureCategory, safeMessage, retryable, failedAt: new Date().toISOString(), ...(nextEligibleAt === undefined ? {} : { nextEligibleAt }) }, "fail");
    }
    if (operation === "retry" && filtered.length === 4) {
      const nextEligibleAt = optionValue(arguments_, "--next-eligible-at"); const reasonCode = optionValue(arguments_, "--reason");
      return nextEligibleAt === undefined || reasonCode === undefined ? invalid("Queue retry requires --next-eligible-at and --reason.") : mutation({ jobId: filtered[3]!, nextEligibleAt, reasonCode }, "scheduleRetry");
    }
    if (operation === "release-due" && filtered.length === 3) {
      const dueAt = optionValue(arguments_, "--due-at"); const limit = integer("--limit");
      return dueAt === undefined || limit === undefined ? invalid("Queue release-due requires --due-at and --limit.") : mutation({ dueAt, limit }, "releaseDueRetries");
    }
    if ((operation === "skip" || operation === "block") && filtered.length === 4) {
      const reasonCode = optionValue(arguments_, "--reason"); const safeMessage = optionValue(arguments_, "--message"); const claimToken = optionValue(arguments_, "--claim-token");
      return reasonCode === undefined || safeMessage === undefined ? invalid(`Queue ${operation} requires --reason and --message.`) : mutation({ jobId: filtered[3]!, reasonCode, safeMessage, ...(claimToken === undefined ? {} : { claimToken }) }, operation);
    }
    if (operation === "clear-pending" && filtered.length === 3) {
      const reasonCode = optionValue(arguments_, "--reason"); const confirmation = optionValue(arguments_, "--confirm");
      return reasonCode === undefined || confirmation === undefined ? invalid("Queue clear-pending requires --reason and --confirm.") : mutation({ reasonCode, confirmation }, "clearPending");
    }
    return invalid(`Invalid queue ${operation} arguments.`);
  }
  if (filtered[0] !== "project" || filtered[1] === undefined) return invalid("Unknown command.");
  const operation = filtered[1];
  if (operation === "create" && filtered.length === 3) {
    const name = optionValue(arguments_, "--name");
    const slug = optionValue(arguments_, "--slug");
    const baseUrl = optionValue(arguments_, "--base-url");
    if (name === undefined || slug === undefined) return invalid("Project create requires --name and --slug.");
    return {
      kind: "project",
      operation,
      json,
      payload: {
        destinationPath: filtered[2]!,
        name,
        slug,
        ...(baseUrl === undefined ? {} : { baseUrl }),
      },
    };
  }
  if ((operation === "open" || operation === "validate") && filtered.length === 3) {
    return { kind: "project", operation, json, payload: { projectPath: filtered[2]! } };
  }
  if (operation === "export" && filtered.length === 4) {
    return { kind: "project", operation, json, payload: { projectPath: filtered[2]!, archivePath: filtered[3]! } };
  }
  if (operation === "import" && filtered.length === 4) {
    return { kind: "project", operation, json, payload: { archivePath: filtered[2]!, destinationPath: filtered[3]! } };
  }
  if (operation === "info" && (filtered.length === 2 || filtered.length === 3)) {
    return {
      kind: "project",
      operation,
      json,
      payload: filtered[2] === undefined ? {} : { projectPath: filtered[2] },
    };
  }
  return invalid(`Invalid project ${operation} arguments.`);
}

export function formatHumanDescription(response: SuccessResponseEnvelope): string {
  const result = response.result;
  if (result.resultType === "system.description") {
    return [
      `${result.applicationName} ${result.applicationVersion}`,
      `Contract: ${result.contractVersion}`,
      `Core status: ${result.coreStatus}`,
      `Implemented: ${result.implementedCapabilities.join(", ")}`,
      `Planned, not implemented: ${result.plannedCapabilities.join(", ")}`,
      `Runtime: ${result.runtime.name} ${result.runtime.version}`,
      `Platform: ${result.platform.operatingSystem} ${result.platform.architecture}`,
      `Correlation ID: ${response.correlationId}`,
    ].join("\n");
  }
  if (result.resultType === "project.summary") {
    const project = result.project;
    return [
      `Project: ${project.name} (${project.projectId})`,
      `Location: ${project.projectPath}`,
      `Format: ${project.formatVersion}`,
      `Database schema: ${project.schemaVersion}`,
      `Revision: ${project.revisionId}`,
      `Run: ${project.runId}`,
      `State: ${project.state}`,
      `Migration: ${project.migrationStatus}`,
    ].join("\n");
  }
  if (result.resultType === "project.validation") {
    return [
      `Validation: ${result.report.valid ? "valid" : "invalid"}`,
      `Format: ${result.report.compatibility.formatVersion ?? "unknown"}`,
      `Database schema: ${result.report.compatibility.schemaVersion ?? "unknown"}`,
      `Migration required: ${result.report.compatibility.requiresMigration ? "yes" : "no"}`,
      ...result.report.issues.map((entry) => `${entry.severity.toUpperCase()} ${entry.code}: ${entry.message}`),
    ].join("\n");
  }
  if (result.resultType === "project.export") {
    return `Exported ${result.export.entryCount} entries to ${result.export.archivePath}\nSHA-256: ${result.export.sha256}`;
  }
  if (result.resultType === "project.import") {
    return `Imported ${result.import.project.name} to ${result.import.project.projectPath}\nProject ID: ${result.import.project.projectId}`;
  }
  if (result.resultType === "profile.value") {
    return [`Site Profile: ${result.profile.name}`, `Profile ID: ${result.profile.profileId}`, `Revision: ${result.profile.sequence} (${result.profile.revisionId})`, `Base URL: ${result.profile.baseUrl}`, `Seeds: ${result.profile.seedUrls.length}`, `Authorization: ${result.profile.authorization.status}`, ...(result.changedPaths === undefined ? [] : [`Changed: ${result.changedPaths.join(", ")}`])].join("\n");
  }
  if (result.resultType === "profile.validation") {
    return [`Profile validation: ${result.validation.valid ? "valid" : "invalid"}`, ...result.validation.errors.map((entry) => `ERROR ${entry.code}: ${entry.message}`), ...result.validation.warnings.map((entry) => `WARNING ${entry.code}: ${entry.message}`)].join("\n");
  }
  if (result.resultType === "profile.comparison") {
    return [`From: ${result.comparison.fromRevisionId}`, `To: ${result.comparison.toRevisionId}`, `Changed: ${result.comparison.changedPaths.join(", ") || "none"}`].join("\n");
  }
  if (result.resultType === "scope.decision") {
    return [`Eligible: ${result.decision.eligible ? "yes" : "no"}`, `Queue eligible: ${result.decision.shouldQueue ? "yes" : "no"}`, `Normalized: ${result.decision.displayUrl ?? "unavailable"}`, `Identity: ${result.decision.identityHash ?? "unavailable"}`, `Reasons: ${result.decision.reasonCodes.join(", ")}`, `Matched rules: ${result.decision.matchedRules.map((rule) => `${rule.ruleType}:${rule.ruleId}:${rule.ruleAction}:${rule.ruleMatch}`).join(", ") || "none"}`].join("\n");
  }
  if (result.resultType === "scope.batch") return `Evaluated ${result.decisions.length} URLs.`;
  if (result.resultType === "scope.engineInfo") return [`Scope Engine: ${result.info.engineVersion}`, `Profile schema: ${result.info.profileSchemaVersion}`, `Identity: ${result.info.identityAlgorithm}`, `Network access: ${result.info.networkAccess ? "yes" : "no"}`].join("\n");
  if (result.resultType === "queue.enqueue") {
    const enqueue = result.enqueue;
    if (enqueue.job === null) return [`Queue outcome: ${enqueue.outcome}`, `Reasons: ${"reasonCodes" in enqueue ? enqueue.reasonCodes.join(", ") : enqueue.errorCode}`].join("\n");
    return [`Queue outcome: ${enqueue.outcome}`, `Job: ${enqueue.job.jobId}`, `State: ${enqueue.job.state}`, `Sequence: ${enqueue.job.queueSequence}`, `Identity: ${enqueue.job.identityHash}`, `Depth: ${enqueue.job.depth}`].join("\n");
  }
  if (result.resultType === "queue.batch") return [`Batch items: ${result.items.length}`, `Created: ${result.counts.created}`, `Existing: ${result.counts.existing}`, `Rejected: ${result.counts.rejected}`, `Blocked: ${result.counts.blocked}`, `Invalid: ${result.counts.invalid}`, `Failed: ${result.counts.failed}`].join("\n");
  if (result.resultType === "queue.job") {
    if (result.job === null) return `Queue ${result.action}: no eligible Job.`;
    return [`Queue action: ${result.action}`, `Job: ${result.job.jobId}`, `State: ${result.job.state}`, `Attempt: ${result.job.attemptCount}/${result.job.maxAttempts}`, `Sequence: ${result.job.queueSequence}`].join("\n");
  }
  if (result.resultType === "queue.released") return `Released ${result.jobs.length} due retry Job(s).`;
  if (result.resultType === "queue.list") return [`Jobs: ${result.jobs.length}`, ...result.jobs.map((job) => `${job.queueSequence} ${job.jobId} ${job.state} p=${job.priority} d=${job.depth}`), `Next cursor: ${result.nextCursor ?? "none"}`].join("\n");
  if (result.resultType === "queue.statistics") {
    const statistics = result.statistics;
    return [`Queue Jobs: ${statistics.total}`, `Pending: ${statistics.pending}`, `Processing: ${statistics.processing}`, `Completed: ${statistics.completed}`, `Failed: ${statistics.failed}`, `Retrying: ${statistics.retrying}`, `Skipped: ${statistics.skipped}`, `Blocked: ${statistics.blocked}`, `Due retries: ${statistics.dueRetries}`, `Exhausted retries: ${statistics.exhaustedRetries}`, `Duplicate discoveries: ${statistics.duplicateDiscoveries}`].join("\n");
  }
  if (result.resultType === "queue.history") return [`Job: ${result.history.job.jobId}`, `State: ${result.history.job.state}`, `Transitions: ${result.history.transitions.length}`, `Attempts: ${result.history.attempts.length}`, `Discoveries: ${result.history.discoveries.length}`].join("\n");
  if (result.resultType === "queue.clear") return `Skipped ${result.skipped} pending Job(s); history was retained.`;
  return [
    `Current Project: ${result.currentProject?.name ?? "none"}`,
    `Compatible: ${result.compatibility === null ? "not inspected" : result.compatibility.compatible ? "yes" : "no"}`,
    `Format: ${result.compatibility?.formatVersion ?? "unknown"}`,
    `Database schema: ${result.compatibility?.schemaVersion ?? "unknown"}`,
  ].join("\n");
}

function exitCodeForError(error: ErrorContract): number {
  if (error.category === "contract") return CLI_EXIT_CODES.contract;
  if (error.category === "validation" || error.category === "security") return CLI_EXIT_CODES.validation;
  if (error.category === "internal") return CLI_EXIT_CODES.internal;
  return CLI_EXIT_CODES.application;
}

function createService(environment: Readonly<Record<string, string | undefined>>): ApplicationService {
  const configuration = readEnvironmentConfiguration(environment);
  return createApplicationService({
    configuration,
    ...readRuntimePlatformInfo(),
    logger: createDevelopmentLogger((line) => process.stderr.write(`${line}\n`)),
  });
}

function metadata() {
  return {
    commandId: `command-${randomUUID()}`,
    correlationId: `correlation-${randomUUID()}`,
    timestamp: new Date().toISOString(),
  };
}

async function executeParsed(parsed: Extract<ParsedArguments, { kind: "describe" | "project" | "profile" | "scope" | "queue" }>, service: ApplicationService): Promise<ResponseEnvelope> {
  if (parsed.kind === "describe") {
    return parseResponseEnvelope(await service.execute(createSystemDescribeCommand(metadata()), { transport: "cli", authorized: true }));
  }
  if (parsed.kind === "profile") {
    let payload: unknown = parsed.payload;
    if (parsed.operation === "create") payload = parsed.payload;
    if (parsed.operation === "update") {
      const value = JSON.parse(await readFile(parsed.payload.configPath, "utf8")) as Record<string, unknown>;
      const expectedRevisionId = value["revisionId"];
      const { schemaVersion: _schemaVersion, engineVersion: _engineVersion, profileId: _profileId, projectId: _projectId, revisionId: _revisionId, sequence: _sequence, createdAt: _createdAt, updatedAt: _updatedAt, ...draft } = value;
      payload = { projectPath: parsed.payload.projectPath, expectedRevisionId, draft };
    }
    return parseResponseEnvelope(await service.execute(createProjectCommand(`profile.${parsed.operation}` as Parameters<typeof createProjectCommand>[0], payload, metadata()), { transport: "cli", authorized: true }));
  }
  if (parsed.kind === "scope") {
    return parseResponseEnvelope(await service.execute(createProjectCommand(`scope.${parsed.operation}` as Parameters<typeof createProjectCommand>[0], parsed.payload, metadata()), { transport: "cli", authorized: true }));
  }
  if (parsed.kind === "queue") {
    const commandMetadata = metadata();
    let payload: Record<string, unknown> = { ...parsed.payload };
    if (parsed.batchPath !== undefined) {
      const batchValue = JSON.parse(await readFile(parsed.batchPath, "utf8")) as unknown;
      payload = { ...payload, items: Array.isArray(batchValue) ? batchValue : (batchValue as { items?: unknown }).items };
    }
    if (parsed.operation === "complete") payload = { ...payload, completedAt: commandMetadata.timestamp };
    if (parsed.operation === "fail") payload = { ...payload, failedAt: commandMetadata.timestamp };
    if (["enqueue", "enqueueBatch", "claimNext", "complete", "fail", "scheduleRetry", "releaseDueRetries", "skip", "block", "clearPending"].includes(parsed.operation)) {
      payload = { ...payload, operationId: commandMetadata.commandId };
    }
    return parseResponseEnvelope(await service.execute(createProjectCommand(`queue.${parsed.operation}` as Parameters<typeof createProjectCommand>[0], payload, commandMetadata), { transport: "cli", authorized: true }));
  }
  const commandType = `project.${parsed.operation}` as Parameters<typeof createProjectCommand>[0];
  const openResponse = parsed.operation === "export"
    ? await service.execute(createProjectCommand("project.open", { projectPath: parsed.payload.projectPath }, metadata()), { transport: "cli", authorized: true })
    : null;
  if (openResponse?.status === "error") return openResponse;
  try {
    const response = await service.execute(createProjectCommand(commandType, parsed.payload, metadata()), { transport: "cli", authorized: true });
    if (parsed.operation === "open" && response.status === "success") {
      return parseResponseEnvelope(await service.execute(createProjectCommand("project.close", {}, metadata()), { transport: "cli", authorized: true }));
    }
    return parseResponseEnvelope(response);
  } finally {
    if (parsed.operation === "export" && openResponse?.status === "success") {
      await service.execute(createProjectCommand("project.close", {}, metadata()), { transport: "cli", authorized: true });
    }
  }
}

export async function runCli(
  arguments_: readonly string[],
  io: CliIo,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Promise<number> {
  const parsed = parseCliArguments(arguments_);
  if (parsed.kind === "help") {
    io.stdout(CLI_HELP);
    return CLI_EXIT_CODES.success;
  }
  if (parsed.kind === "version") {
    io.stdout(`${CLI_VERSION}\n`);
    return CLI_EXIT_CODES.success;
  }
  if (parsed.kind === "invalid") {
    io.stderr(`${parsed.message}\n`);
    return CLI_EXIT_CODES.usage;
  }
  try {
    const response = await executeParsed(parsed, createService(environment));
    if (parsed.json) io.stdout(`${JSON.stringify(response, null, 2)}\n`);
    else if (response.status === "success") io.stdout(`${formatHumanDescription(response)}\n`);
    else io.stderr(`${response.error.userMessage} (${response.error.code})\n`);
    if (response.status === "error") return exitCodeForError(response.error);
    if (response.result.resultType === "project.validation" && !response.result.report.valid) return CLI_EXIT_CODES.validation;
    if (response.result.resultType === "project.info" && response.result.compatibility?.compatible === false) return CLI_EXIT_CODES.validation;
    return CLI_EXIT_CODES.success;
  } catch (error) {
    if (error instanceof ContractValidationError) {
      io.stderr(`The command contract is invalid (${error.code}).\n`);
      return CLI_EXIT_CODES.contract;
    }
    io.stderr("The CLI could not initialize safely.\n");
    return CLI_EXIT_CODES.internal;
  }
}

async function main(): Promise<void> {
  process.exitCode = await runCli(process.argv.slice(2), {
    stdout: (value) => process.stdout.write(value),
    stderr: (value) => process.stderr.write(value),
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) void main();
