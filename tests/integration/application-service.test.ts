import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createApplicationService } from "@offline-web-archive/application-service";
import { CONTRACT_VERSION, createProjectCommand } from "@offline-web-archive/contracts";
import { createInMemorySecretStore } from "@offline-web-archive/secrets";
import { createInMemoryLogger, fixedClock, systemDescribeFixture } from "@offline-web-archive/test-support";

function serviceFixture() {
  const logger = createInMemoryLogger();
  return {
    logger,
    service: createApplicationService({
      configuration: { applicationName: "Offline Web Archive Builder", applicationVersion: "0.5.0", contractVersion: CONTRACT_VERSION, logLevel: "info" },
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
    const projectPath = path.join(temporary, "project");
    const profile = await service.execute(createProjectCommand("profile.create", { projectPath, name: "Service Profile", seedUrl: "https://example.com/" }, { commandId: "command-profile-1", correlationId: "correlation-profile-1", timestamp: "2026-07-31T12:00:00.000Z" }), { transport: "cli", authorized: true });
    assert.equal(profile.status, "success");
    const scoped = await service.execute(createProjectCommand("scope.evaluate", { projectPath, input: { url: "https://example.com/?utm_source=test" } }, { commandId: "command-scope-1", correlationId: "correlation-scope-1", timestamp: "2026-07-31T12:00:00.000Z" }), { transport: "cli", authorized: true });
    assert.equal(scoped.status, "success");
    if (scoped.status === "success" && scoped.result.resultType === "scope.decision") assert.equal(scoped.result.decision.identityUrl, "https://example.com/");
    assert.ok(logger.events.some((event) => event.eventName === "project.created"));
    const scopeLog = logger.events.find((event) => event.eventName === "command.completed" && event.correlationId === "correlation-scope-1");
    assert.deepEqual(scopeLog?.metadata?.["reasonCodes"], ["URL_ACCEPTED", "PROFILE_AUTHORIZATION_INCOMPLETE"]);
    assert.deepEqual(scopeLog?.metadata?.["matchedRules"], [{ ruleId: "seed-host", ruleType: "domain", ruleAction: "allow", ruleMatch: "exact" }, { ruleId: "utm_source", ruleType: "query", ruleAction: "tracking", ruleMatch: "key" }]);
    assert.ok(!JSON.stringify(scopeLog).includes("https://"));
    assert.ok(!JSON.stringify(scopeLog).includes("=test"));
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

test("Secret commands expose only backend status and metadata across the Application Service boundary", async () => {
  const temporary = await mkdtemp(path.join(tmpdir(), "owa-secret-service-"));
  const stores: ReturnType<typeof createInMemorySecretStore>[] = [];
  const service = createApplicationService({
    configuration: { applicationName: "Offline Web Archive Builder", applicationVersion: "0.8.0", contractVersion: CONTRACT_VERSION, logLevel: "info" },
    runtime: { name: "Node.js", version: "24.0.0" },
    platform: { operatingSystem: "windows", architecture: "x64" },
    now: fixedClock(),
    secretStoreFactory: ({ projectId, now: clock }) => {
      const store = createInMemorySecretStore({ projectId, now: clock });
      stores.push(store);
      return store;
    },
  });
  const projectPath = path.join(temporary, "project");
  try {
    const created = await service.execute(createProjectCommand("project.create", { destinationPath: projectPath, name: "Secrets", slug: "secrets" }, { commandId: "command-secret-project", correlationId: "correlation-secret-project", timestamp: "2026-08-06T12:00:00.000Z" }), { transport: "cli", authorized: true });
    assert.equal(created.status, "success");
    if (created.status !== "success" || created.result.resultType !== "project.summary") return;
    const status = await service.execute(createProjectCommand("secret.backend.status", { projectPath }, { commandId: "command-secret-status", correlationId: "correlation-secret-status", timestamp: "2026-08-06T12:00:00.000Z" }), { transport: "cli", authorized: true });
    assert.equal(status.status, "success");
    assert.equal(stores.length, 1);
    const store = stores[0]!;
    await store.unlock({ passphrase: Buffer.from("not-used-by-memory") });
    const metadata = await store.createSecret({ projectId: created.result.project.projectId, scope: { scopeType: "project", projectId: created.result.project.projectId, scopeId: created.result.project.projectId }, kind: "generic_project_secret", value: Buffer.from("service-fixture-value"), displayLabel: "service-fixture" });
    const listed = await service.execute(createProjectCommand("secret.list", { projectPath }, { commandId: "command-secret-list", correlationId: "correlation-secret-list", timestamp: "2026-08-06T12:00:00.000Z" }), { transport: "cli", authorized: true });
    assert.equal(listed.status, "success");
    if (listed.status === "success" && listed.result.resultType === "secret.list") {
      assert.equal(listed.result.metadata[0]?.ref, metadata.ref);
      assert.equal("value" in listed.result.metadata[0]!, false);
    }
    await store.unlock({ passphrase: Buffer.from("not-used-by-memory") });
    const deleted = await service.execute(createProjectCommand("secret.delete", { projectPath, ref: metadata.ref }, { commandId: "command-secret-delete", correlationId: "correlation-secret-delete", timestamp: "2026-08-06T12:00:00.000Z" }), { transport: "cli", authorized: true });
    assert.equal(deleted.status, "success");
    assert.equal(JSON.stringify(listed).includes("service-fixture-value"), false);
  } finally {
    await service.close();
    await rm(temporary, { recursive: true, force: true });
  }
});
