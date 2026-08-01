import assert from "node:assert/strict";
import test from "node:test";
import { CLI_EXIT_CODES, formatHumanDescription, parseCliArguments } from "../../apps/cli/src/index.js";
import { parseResponseEnvelope } from "@offline-web-archive/contracts";

test("CLI parser exposes the bounded Project, Profile, Scope, Queue, and Recovery command surface", () => {
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
  assert.equal(parseCliArguments(["crawl"]).kind, "invalid");
  assert.equal(CLI_EXIT_CODES.validation, 4);
});

test("human formatting distinguishes implemented and future capabilities", () => {
  const response = parseResponseEnvelope({
    contractVersion: "1.4.0",
    commandId: "command-1",
    correlationId: "correlation-1",
    timestamp: "2026-07-31T12:00:00.000Z",
    status: "success",
    result: {
      resultType: "system.description",
      applicationName: "Offline Web Archive Builder",
      applicationVersion: "0.7.0",
      contractVersion: "1.4.0",
      coreStatus: "recovery-foundation-ready",
      implementedCapabilities: ["system.describe", "project.create", "queue.enqueue"],
      plannedCapabilities: ["crawl.execution"],
      runtime: { name: "Node.js", version: "24.0.0" },
      platform: { operatingSystem: "windows", architecture: "x64" },
    },
    error: null,
  });
  assert.equal(response.status, "success");
  if (response.status === "success") assert.match(formatHumanDescription(response), /Planned, not implemented: crawl\.execution/);
});
