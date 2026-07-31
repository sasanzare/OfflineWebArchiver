import {
  CONTRACT_VERSION,
  createSystemDescribeCommand,
  parseEventEnvelope,
  parseResponseEnvelope,
  parseSystemDescribeCommand,
} from "@offline-web-archive/contracts";

const timestamp = "2026-07-31T12:00:00.000Z";
const command = createSystemDescribeCommand({
  commandId: "contract-check-command",
  correlationId: "contract-check-correlation",
  timestamp,
});
parseSystemDescribeCommand(JSON.parse(JSON.stringify(command)));
parseResponseEnvelope({
  contractVersion: CONTRACT_VERSION,
  commandId: command.commandId,
  correlationId: command.correlationId,
  timestamp,
  status: "error",
  result: null,
  error: {
    code: "APPLICATION_COMMAND_FAILED",
    category: "application",
    message: "Contract validation fixture.",
    userMessage: "The fixture did not complete.",
    retryable: false,
  },
});
parseEventEnvelope({
  contractVersion: CONTRACT_VERSION,
  eventId: "contract-check-event",
  eventType: "system.describe.completed",
  correlationId: command.correlationId,
  sequence: 0,
  timestamp,
  payload: { coreStatus: "architecture-ready" },
});
process.stdout.write(`Contract ${CONTRACT_VERSION} command, response, error, and event checks passed.\n`);
