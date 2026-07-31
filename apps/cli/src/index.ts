#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { createApplicationService, type ApplicationService } from "@offline-web-archive/application-service";
import {
  createProjectCommand,
  createSystemDescribeCommand,
  parseResponseEnvelope,
  type ErrorContract,
  type ResponseEnvelope,
  type SuccessResponseEnvelope,
} from "@offline-web-archive/contracts";
import { createDevelopmentLogger } from "@offline-web-archive/observability";
import { readEnvironmentConfiguration, readRuntimePlatformInfo } from "@offline-web-archive/platform";

export const CLI_VERSION = "0.4.0";

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
  offline-archive --help
  offline-archive --version

Project commands are local-only. This phase does not crawl or contact a website.
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
  const filtered = arguments_.filter((argument, index) => {
    if (argument === "--json") return false;
    if (["--name", "--slug", "--base-url"].includes(arguments_[index - 1] ?? "")) return false;
    return !["--name", "--slug", "--base-url"].includes(argument);
  });
  if (filtered.length === 2 && filtered[0] === "system" && filtered[1] === "describe") return { kind: "describe", json };
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

async function executeParsed(parsed: Extract<ParsedArguments, { kind: "describe" | "project" }>, service: ApplicationService): Promise<ResponseEnvelope> {
  if (parsed.kind === "describe") {
    return parseResponseEnvelope(await service.execute(createSystemDescribeCommand(metadata()), { transport: "cli", authorized: true }));
  }
  const commandType = `project.${parsed.operation}` as const;
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
  } catch {
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
