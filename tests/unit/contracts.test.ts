import assert from "node:assert/strict";
import test from "node:test";
import {
  CONTRACT_VERSION,
  ContractValidationError,
  createProjectCommand,
  createSystemDescribeCommand,
  parseCommandEnvelope,
  parseEventEnvelope,
  parseResponseEnvelope,
} from "@offline-web-archive/contracts";

const metadata = {
  commandId: "command-1",
  correlationId: "correlation-1",
  timestamp: "2026-07-31T12:00:00.000Z",
};

test("all Project command contracts survive JSON serialization", () => {
  const commands = [
    createSystemDescribeCommand(metadata),
    createProjectCommand("project.create", { destinationPath: "C:\\archive", name: "Archive", slug: "archive" }, metadata),
    createProjectCommand("project.open", { projectPath: "/archive" }, metadata),
    createProjectCommand("project.close", {}, metadata),
    createProjectCommand("project.validate", { projectPath: "/archive" }, metadata),
    createProjectCommand("project.export", { projectPath: "/archive", archivePath: "/archive.zip" }, metadata),
    createProjectCommand("project.import", { archivePath: "/archive.zip", destinationPath: "/copy" }, metadata),
    createProjectCommand("project.info", {}, metadata),
  ];
  commands.forEach((command) => assert.deepEqual(parseCommandEnvelope(JSON.parse(JSON.stringify(command))), command));
});

test("unknown fields, malformed payloads, and unsupported versions fail closed", () => {
  const base = createSystemDescribeCommand(metadata);
  assert.throws(() => parseCommandEnvelope({ ...base, unexpected: true }), ContractValidationError);
  assert.throws(
    () => parseCommandEnvelope({ ...base, contractVersion: "2.0.0" }),
    (error) => error instanceof ContractValidationError && error.code === "CONTRACT_UNSUPPORTED_VERSION",
  );
  assert.throws(() => createProjectCommand("project.create", { destinationPath: "/x", name: "X", slug: "Bad Slug" }, metadata));
});

test("response and progress event envelopes preserve correlation", () => {
  const response = parseResponseEnvelope({
    contractVersion: CONTRACT_VERSION,
    commandId: metadata.commandId,
    correlationId: metadata.correlationId,
    timestamp: metadata.timestamp,
    status: "error",
    result: null,
    error: { code: "PROJECT_LOCKED", category: "application", message: "Fixture failure.", userMessage: "The operation failed.", retryable: true },
  });
  const event = parseEventEnvelope({
    contractVersion: CONTRACT_VERSION,
    eventId: "event-1",
    eventType: "project.operation.progress",
    correlationId: response.correlationId,
    sequence: 0,
    timestamp: response.timestamp,
    payload: { operation: "project.import", stage: "inspect", percent: 10 },
  });
  assert.equal(event.correlationId, "correlation-1");
});
