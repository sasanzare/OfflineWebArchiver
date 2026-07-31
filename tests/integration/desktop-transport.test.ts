import assert from "node:assert/strict";
import test from "node:test";
import { createApplicationService } from "@offline-web-archive/application-service";
import { CONTRACT_VERSION } from "@offline-web-archive/contracts";
import { systemDescribeFixture } from "@offline-web-archive/test-support";
import { createDesktopTransportHandler } from "../../apps/desktop/src/main/ipc-transport.js";

test("desktop adapter preserves contracts and enforces sender authorization", async () => {
  const service = createApplicationService({
    configuration: {
      applicationName: "Offline Web Archive Builder",
      applicationVersion: "0.5.0",
      contractVersion: CONTRACT_VERSION,
      logLevel: "error",
    },
    runtime: { name: "Node.js", version: "24.0.0" },
    platform: { operatingSystem: "windows", architecture: "x64" },
  });
  const transport = createDesktopTransportHandler(service);
  assert.equal((await transport.execute(systemDescribeFixture(), true)).status, "success");
  const denied = await transport.execute(systemDescribeFixture(), false);
  assert.equal(denied.status, "error");
  if (denied.status === "error") assert.equal(denied.error.category, "security");
});
