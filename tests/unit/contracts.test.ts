import assert from "node:assert/strict";
import test from "node:test";
import {
  CONTRACT_VERSION,
  ContractValidationError,
  createSystemDescribeCommand,
  parseEventEnvelope,
  parseResponseEnvelope,
  parseSystemDescribeCommand,
} from "@offline-web-archive/contracts";

test("command contracts survive JSON serialization", () => {
  const command = createSystemDescribeCommand({
    commandId: "command-1",
    correlationId: "correlation-1",
    timestamp: "2026-07-31T12:00:00.000Z",
  });
  assert.deepEqual(parseSystemDescribeCommand(JSON.parse(JSON.stringify(command))), command);
});

test("unknown fields and unsupported versions fail closed", () => {
  const base = {
    contractVersion: CONTRACT_VERSION,
    commandId: "command-1",
    commandType: "system.describe",
    correlationId: "correlation-1",
    timestamp: "2026-07-31T12:00:00.000Z",
    payload: {},
  };
  assert.throws(() => parseSystemDescribeCommand({ ...base, unexpected: true }), ContractValidationError);
  assert.throws(
    () => parseSystemDescribeCommand({ ...base, contractVersion: "2.0.0" }),
    (error) => error instanceof ContractValidationError && error.code === "CONTRACT_UNSUPPORTED_VERSION",
  );
});

test("response and event envelopes preserve correlation", () => {
  const response = parseResponseEnvelope({
    contractVersion: CONTRACT_VERSION,
    commandId: "command-1",
    correlationId: "correlation-1",
    timestamp: "2026-07-31T12:00:00.000Z",
    status: "error",
    result: null,
    error: {
      code: "APPLICATION_COMMAND_FAILED",
      category: "application",
      message: "Fixture failure.",
      userMessage: "The operation failed.",
      retryable: false,
    },
  });
  const event = parseEventEnvelope({
    contractVersion: CONTRACT_VERSION,
    eventId: "event-1",
    eventType: "system.describe.completed",
    correlationId: response.correlationId,
    sequence: 0,
    timestamp: response.timestamp,
    payload: { coreStatus: "architecture-ready" },
  });
  assert.equal(event.correlationId, "correlation-1");
});
