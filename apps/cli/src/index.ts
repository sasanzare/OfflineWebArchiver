#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { createApplicationService } from "@offline-web-archive/application-service";
import {
  createSystemDescribeCommand,
  parseResponseEnvelope,
  type ErrorContract,
  type ResponseEnvelope,
  type SuccessResponseEnvelope,
} from "@offline-web-archive/contracts";
import { createDevelopmentLogger } from "@offline-web-archive/observability";
import {
  readEnvironmentConfiguration,
  readRuntimePlatformInfo,
} from "@offline-web-archive/platform";

export const CLI_VERSION = "0.3.0";

export const CLI_EXIT_CODES = Object.freeze({
  success: 0,
  usage: 2,
  contract: 3,
  application: 5,
  internal: 70,
});

export const CLI_HELP = `Offline Web Archive Builder CLI

Usage:
  offline-archive system describe [--json]
  offline-archive --help
  offline-archive --version

Product Phase 3 implements only the architecture smoke command.
`;

export interface CliIo {
  stdout(value: string): void;
  stderr(value: string): void;
}

type ParsedArguments =
  | { kind: "help" }
  | { kind: "version" }
  | { kind: "describe"; json: boolean }
  | { kind: "invalid"; message: string };

export function parseCliArguments(arguments_: readonly string[]): ParsedArguments {
  if (arguments_.length === 0 || arguments_.includes("--help") || arguments_.includes("-h")) {
    return { kind: "help" };
  }
  if (arguments_.length === 1 && (arguments_[0] === "--version" || arguments_[0] === "-v")) {
    return { kind: "version" };
  }
  const json = arguments_.includes("--json");
  const positional = arguments_.filter((argument) => argument !== "--json");
  if (
    positional.length === 2 &&
    positional[0] === "system" &&
    positional[1] === "describe"
  ) {
    return { kind: "describe", json };
  }
  return {
    kind: "invalid",
    message: "Unknown command. Run offline-archive --help for usage.",
  };
}

export function formatHumanDescription(response: SuccessResponseEnvelope): string {
  const result = response.result;
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

function exitCodeForError(error: ErrorContract): number {
  if (error.category === "contract" || error.category === "validation") {
    return CLI_EXIT_CODES.contract;
  }
  if (error.category === "internal") return CLI_EXIT_CODES.internal;
  return CLI_EXIT_CODES.application;
}

async function executeDescribe(
  environment: Readonly<Record<string, string | undefined>>,
): Promise<ResponseEnvelope> {
  const configuration = readEnvironmentConfiguration(environment);
  const runtimePlatform = readRuntimePlatformInfo();
  const service = createApplicationService({
    configuration,
    ...runtimePlatform,
    logger: createDevelopmentLogger((line) => process.stderr.write(`${line}\n`)),
  });
  const command = createSystemDescribeCommand({
    commandId: `command-${randomUUID()}`,
    correlationId: `correlation-${randomUUID()}`,
    timestamp: new Date().toISOString(),
  });
  return parseResponseEnvelope(
    await service.execute(command, { transport: "cli", authorized: true }),
  );
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
    const response = await executeDescribe(environment);
    if (parsed.json) {
      io.stdout(`${JSON.stringify(response, null, 2)}\n`);
    } else if (response.status === "success") {
      io.stdout(`${formatHumanDescription(response)}\n`);
    } else {
      io.stderr(`${response.error.userMessage} (${response.error.code})\n`);
    }
    return response.status === "success"
      ? CLI_EXIT_CODES.success
      : exitCodeForError(response.error);
  } catch {
    io.stderr("The CLI could not initialize safely.\n");
    return CLI_EXIT_CODES.internal;
  }
}

async function main(): Promise<void> {
  const exitCode = await runCli(process.argv.slice(2), {
    stdout: (value) => process.stdout.write(value),
    stderr: (value) => process.stderr.write(value),
  });
  process.exitCode = exitCode;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  void main();
}
