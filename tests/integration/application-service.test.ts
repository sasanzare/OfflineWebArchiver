import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createApplicationService } from "@offline-web-archive/application-service";
import { CONTRACT_VERSION, createProjectCommand } from "@offline-web-archive/contracts";
import { createInMemoryLogger, fixedClock, systemDescribeFixture } from "@offline-web-archive/test-support";

function serviceFixture() {
  const logger = createInMemoryLogger();
  return {
    logger,
    service: createApplicationService({
      configuration: { applicationName: "Offline Web Archive Builder", applicationVersion: "0.4.0", contractVersion: CONTRACT_VERSION, logLevel: "info" },
      runtime: { name: "Node.js", version: "24.0.0" },
      platform: { operatingSystem: "windows", architecture: "x64" },
      logger,
      now: fixedClock(),
    }),
  };
}

test("application service carries versioned system and Project commands", async () => {
  const temporary = await mkdtemp(path.join(tmpdir(), "owa-service-"));
  const { logger, service } = serviceFixture();
  try {
    const described = await service.execute(systemDescribeFixture(), { transport: "cli", authorized: true });
    assert.equal(described.status, "success");
    const command = createProjectCommand("project.create", { destinationPath: path.join(temporary, "project"), name: "Service", slug: "service" }, {
      commandId: "command-project-1", correlationId: "correlation-project-1", timestamp: "2026-07-31T12:00:00.000Z",
    });
    const created = await service.execute(command, { transport: "cli", authorized: true });
    assert.equal(created.status, "success");
    assert.ok(logger.events.some((event) => event.eventName === "project.created"));
    assert.ok(logger.events.every((event) => !JSON.stringify(event).includes(temporary)));
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
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
