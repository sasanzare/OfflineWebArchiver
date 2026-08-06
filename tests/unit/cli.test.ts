import assert from "node:assert/strict";
import test from "node:test";
import { CLI_EXIT_CODES, formatHumanDescription, parseCliArguments } from "../../apps/cli/src/index.js";
import { CONTRACT_VERSION, parseResponseEnvelope } from "@offline-web-archive/contracts";

test("CLI parser exposes the bounded Project, Queue, Recovery, Browser, Render, and Interaction command surface", () => {
  assert.deepEqual(parseCliArguments(["system", "describe", "--json"]), { kind: "describe", json: true });
  const create = parseCliArguments(["project", "create", "C:\\demo", "--name", "Demo", "--slug", "demo"]);
  assert.equal(create.kind, "project");
  if (create.kind === "project") assert.equal(create.operation, "create");
  assert.deepEqual(parseCliArguments(["scope", "evaluate", "C:\\demo", "../page", "--source", "https://example.com/docs/", "--source-depth", "2", "--discovery-type", "dom-link", "--profile-revision", "00000000-0000-4000-8000-000000000001", "--count", "4", "--json"]), {
    kind: "scope",
    operation: "evaluate",
    json: true,
    payload: { projectPath: "C:\\demo", input: { rawUrl: "../page", sourceUrl: "https://example.com/docs/", sourceDepth: 2, discoveryType: "dom-link", profileRevision: "00000000-0000-4000-8000-000000000001", currentEligibleCount: 4 } },
  });
  const queue = parseCliArguments(["queue", "claim-next", "C:\\demo", "--run", "00000000-0000-4000-8000-000000000002", "--claimed-by", "cli-test", "--idempotency-key", "claim-001"]);
  assert.equal(queue.kind, "queue");
  if (queue.kind === "queue") assert.equal(queue.operation, "claimNext");
  const recovery = parseCliArguments(["recovery", "recover", "C:\\demo", "--run", "00000000-0000-4000-8000-000000000002", "--at", "2026-08-01T12:00:00.000Z", "--dry-run"]);
  assert.equal(recovery.kind, "recovery");
  if (recovery.kind === "recovery") assert.equal(recovery.operation, "inspect");
  assert.equal(parseCliArguments(["recovery", "recover", "C:\\demo", "--run", "00000000-0000-4000-8000-000000000002", "--at", "2026-08-01T12:00:00.000Z"]).kind, "invalid");
  assert.equal(parseCliArguments(["run", "pause", "C:\\demo", "--run", "00000000-0000-4000-8000-000000000002"]).kind, "run");
  assert.equal(parseCliArguments(["lease", "list", "C:\\demo", "--run", "00000000-0000-4000-8000-000000000002"]).kind, "lease");
  assert.equal(parseCliArguments(["checkpoint", "show", "C:\\demo", "00000000-0000-4000-8000-000000000003", "--run", "00000000-0000-4000-8000-000000000002"]).kind, "checkpoint");
  assert.equal(parseCliArguments(["browser", "validate", "--json"]).kind, "browser");
  const secret = parseCliArguments(["secret", "backend-status", "C:\\demo", "--json"]);
  assert.equal(secret.kind, "secret");
  if (secret.kind === "secret") assert.equal(secret.operation, "backend.status");
  const malformedSecret = parseCliArguments(["secret", "delete", "C:\\demo", "secret://v1/project/not-a-project/not-a-secret"]);
  assert.equal(malformedSecret.kind, "secret");
  const render = parseCliArguments(["render", "start", "C:\\demo", "00000000-0000-4000-8000-000000000003", "--run", "00000000-0000-4000-8000-000000000002", "--owner", "cli-renderer", "--operation-id", "render-op-1", "--idempotency-key", "render-idem-1", "--screenshot"]);
  assert.equal(render.kind, "render");
  if (render.kind === "render") {
    assert.equal(render.operation, "start");
    assert.equal(render.payload["jobId"], "00000000-0000-4000-8000-000000000003");
    assert.equal((render.payload["policy"] as Record<string, unknown>)["captureScreenshot"], true);
    assert.equal("url" in render.payload, false);
  }
  assert.equal(parseCliArguments(["render", "start", "C:\\demo", "job", "--run", "run", "--owner", "owner"]).kind, "invalid");
  const interaction = parseCliArguments(["interaction", "run", "C:\\demo", "00000000-0000-4000-8000-000000000003", "--run", "00000000-0000-4000-8000-000000000002", "--owner", "cli-interaction", "--plan-id", "plan-10", "--operation-id", "interaction-op-1", "--idempotency-key", "interaction-idem-1"]);
  assert.equal(interaction.kind, "interaction");
  if (interaction.kind === "interaction") assert.equal(interaction.operation, "run");
  assert.equal(parseCliArguments(["crawl"]).kind, "invalid");
  assert.equal(CLI_EXIT_CODES.validation, 4);
});

test("human formatting distinguishes implemented and future capabilities", () => {
  const response = parseResponseEnvelope({
    contractVersion: CONTRACT_VERSION,
    commandId: "command-1",
    correlationId: "correlation-1",
    timestamp: "2026-07-31T12:00:00.000Z",
    status: "success",
    result: {
      resultType: "system.description",
      applicationName: "Offline Web Archive Builder",
      applicationVersion: "0.8.0",
      contractVersion: CONTRACT_VERSION,
      coreStatus: "rendering-engine-ready",
      implementedCapabilities: ["system.describe", "project.create", "queue.enqueue", "browser.getHealth", "render.start"],
      plannedCapabilities: ["link.discovery", "crawl.execution"],
      runtime: { name: "Node.js", version: "24.0.0" },
      platform: { operatingSystem: "windows", architecture: "x64" },
    },
    error: null,
  });
  assert.equal(response.status, "success");
  if (response.status === "success") assert.match(formatHumanDescription(response), /Planned, not implemented: link\.discovery, crawl\.execution/);
});
