import {
  CONTRACT_VERSION,
  createProjectCommand,
  createSystemDescribeCommand,
  parseCommandEnvelope,
  parseEventEnvelope,
  parseResponseEnvelope,
} from "@offline-web-archive/contracts";

const timestamp = "2026-07-31T12:00:00.000Z";
const metadata = { commandId: "contract-check-command", correlationId: "contract-check-correlation", timestamp };
const commands = [
  createSystemDescribeCommand(metadata),
  createProjectCommand("project.create", { destinationPath: "C:\\Projects\\sample", name: "Sample", slug: "sample" }, metadata),
  createProjectCommand("project.open", { projectPath: "/projects/sample" }, metadata),
  createProjectCommand("project.close", {}, metadata),
  createProjectCommand("project.validate", { projectPath: "/projects/sample" }, metadata),
  createProjectCommand("project.export", { projectPath: "/projects/sample", archivePath: "/exports/sample.zip" }, metadata),
  createProjectCommand("project.import", { archivePath: "/exports/sample.zip", destinationPath: "/projects/imported" }, metadata),
  createProjectCommand("project.info", { projectPath: "/projects/sample" }, metadata),
];
commands.forEach((command) => parseCommandEnvelope(JSON.parse(JSON.stringify(command))));
parseResponseEnvelope({
  contractVersion: CONTRACT_VERSION,
  commandId: metadata.commandId,
  correlationId: metadata.correlationId,
  timestamp,
  status: "error",
  result: null,
  error: {
    code: "PROJECT_LOCKED",
    category: "application",
    message: "Contract validation fixture.",
    userMessage: "The fixture did not complete.",
    retryable: true,
  },
});
parseEventEnvelope({
  contractVersion: CONTRACT_VERSION,
  eventId: "contract-check-event",
  eventType: "project.operation.progress",
  correlationId: metadata.correlationId,
  sequence: 0,
  timestamp,
  payload: { operation: "project.export", stage: "snapshot", percent: 50 },
});
process.stdout.write(`Contract ${CONTRACT_VERSION} validated ${commands.length} commands plus response, error, and event envelopes.\n`);
