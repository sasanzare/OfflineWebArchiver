import assert from "node:assert/strict";
import test from "node:test";
import { CLI_EXIT_CODES, formatHumanDescription, parseCliArguments } from "../../apps/cli/src/index.js";
import { parseResponseEnvelope } from "@offline-web-archive/contracts";

test("CLI parser keeps the command surface narrow", () => {
  assert.deepEqual(parseCliArguments(["system", "describe", "--json"]), { kind: "describe", json: true });
  assert.equal(parseCliArguments(["crawl"]).kind, "invalid");
  assert.equal(CLI_EXIT_CODES.usage, 2);
});

test("human formatting distinguishes implemented and planned capabilities", () => {
  const response = parseResponseEnvelope({
    contractVersion: "1.0.0",
    commandId: "command-1",
    correlationId: "correlation-1",
    timestamp: "2026-07-31T12:00:00.000Z",
    status: "success",
    result: {
      applicationName: "Offline Web Archive Builder",
      applicationVersion: "0.3.0",
      contractVersion: "1.0.0",
      coreStatus: "architecture-ready",
      implementedCapabilities: ["system.describe"],
      plannedCapabilities: ["crawl.execution"],
      runtime: { name: "Node.js", version: "24.0.0" },
      platform: { operatingSystem: "windows", architecture: "x64" },
    },
    error: null,
  });
  assert.equal(response.status, "success");
  if (response.status === "success") {
    assert.match(formatHumanDescription(response), /Planned, not implemented: crawl\.execution/);
  }
});
