import assert from "node:assert/strict";
import test from "node:test";
import { CLI_EXIT_CODES, formatHumanDescription, parseCliArguments } from "../../apps/cli/src/index.js";
import { parseResponseEnvelope } from "@offline-web-archive/contracts";

test("CLI parser exposes the bounded Phase 4 command surface", () => {
  assert.deepEqual(parseCliArguments(["system", "describe", "--json"]), { kind: "describe", json: true });
  const create = parseCliArguments(["project", "create", "C:\\demo", "--name", "Demo", "--slug", "demo"]);
  assert.equal(create.kind, "project");
  if (create.kind === "project") assert.equal(create.operation, "create");
  assert.equal(parseCliArguments(["crawl"]).kind, "invalid");
  assert.equal(CLI_EXIT_CODES.validation, 4);
});

test("human formatting distinguishes implemented and future capabilities", () => {
  const response = parseResponseEnvelope({
    contractVersion: "1.1.0",
    commandId: "command-1",
    correlationId: "correlation-1",
    timestamp: "2026-07-31T12:00:00.000Z",
    status: "success",
    result: {
      resultType: "system.description",
      applicationName: "Offline Web Archive Builder",
      applicationVersion: "0.4.0",
      contractVersion: "1.1.0",
      coreStatus: "project-foundation-ready",
      implementedCapabilities: ["system.describe", "project.create"],
      plannedCapabilities: ["crawl.execution"],
      runtime: { name: "Node.js", version: "24.0.0" },
      platform: { operatingSystem: "windows", architecture: "x64" },
    },
    error: null,
  });
  assert.equal(response.status, "success");
  if (response.status === "success") assert.match(formatHumanDescription(response), /Planned, not implemented: crawl\.execution/);
});
