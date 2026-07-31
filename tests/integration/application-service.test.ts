import assert from "node:assert/strict";
import test from "node:test";
import { createApplicationService } from "@offline-web-archive/application-service";
import { CONTRACT_VERSION } from "@offline-web-archive/contracts";
import { createInMemoryLogger, fixedClock, systemDescribeFixture } from "@offline-web-archive/test-support";

function serviceFixture() {
  const logger = createInMemoryLogger();
  return {
    logger,
    service: createApplicationService({
      configuration: {
        applicationName: "Offline Web Archive Builder",
        applicationVersion: "0.3.0",
        contractVersion: CONTRACT_VERSION,
        logLevel: "info",
      },
      runtime: { name: "Node.js", version: "24.0.0" },
      platform: { operatingSystem: "windows", architecture: "x64" },
      logger,
      now: fixedClock(),
    }),
  };
}

test("application service carries a versioned command through the core", async () => {
  const { logger, service } = serviceFixture();
  const command = systemDescribeFixture();
  const response = await service.execute(command, { transport: "cli", authorized: true });
  assert.equal(response.status, "success");
  assert.equal(response.commandId, command.commandId);
  assert.equal(response.correlationId, command.correlationId);
  assert.deepEqual(logger.events.map((event) => event.eventName), ["command.started", "command.completed"]);
});

test("transport denial and invalid contract return safe structured errors", async () => {
  const { service } = serviceFixture();
  const command = systemDescribeFixture();
  const denied = await service.execute(command, { transport: "electron-ipc", authorized: false });
  assert.equal(denied.status, "error");
  if (denied.status === "error") assert.equal(denied.error.code, "SECURITY_UNAUTHORIZED_TRANSPORT");
  const invalid = await service.execute({ ...command, payload: { unexpected: true } }, { transport: "cli", authorized: true });
  assert.equal(invalid.status, "error");
  if (invalid.status === "error") assert.equal(invalid.error.code, "CONTRACT_INVALID_PAYLOAD");
});
