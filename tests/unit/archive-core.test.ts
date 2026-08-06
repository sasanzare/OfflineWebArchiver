import assert from "node:assert/strict";
import test from "node:test";
import { createArchiveCore } from "@offline-web-archive/archive-core";

test("core exposes Phase 8 Browser and Render capability without future discovery behavior", () => {
  const description = createArchiveCore().describeSystem();
  assert.equal(description.coreStatus, "rendering-engine-ready");
  assert.ok(description.implementedCapabilities.includes("project.create"));
  assert.ok(description.implementedCapabilities.includes("project.import"));
  assert.ok(description.implementedCapabilities.includes("scope.evaluate"));
  assert.ok(description.implementedCapabilities.includes("queue.enqueue"));
  assert.ok(description.implementedCapabilities.includes("queue.claimNext"));
  assert.ok(description.implementedCapabilities.includes("recovery.recover"));
  assert.ok(description.implementedCapabilities.includes("checkpoint.save"));
  assert.ok(description.implementedCapabilities.includes("browser.getHealth"));
  assert.ok(description.implementedCapabilities.includes("render.start"));
  assert.ok(description.implementedCapabilities.includes("secret.backend.status"));
  assert.ok(description.implementedCapabilities.includes("secret.list"));
  assert.ok(description.plannedCapabilities.includes("crawl.execution"));
  assert.ok(description.plannedCapabilities.includes("link.discovery"));
});
