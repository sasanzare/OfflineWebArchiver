import assert from "node:assert/strict";
import test from "node:test";
import { createArchiveCore } from "@offline-web-archive/archive-core";

test("core exposes Phase 6 persistent Queue capability without future recovery or crawl behavior", () => {
  const description = createArchiveCore().describeSystem();
  assert.equal(description.coreStatus, "queue-foundation-ready");
  assert.ok(description.implementedCapabilities.includes("project.create"));
  assert.ok(description.implementedCapabilities.includes("project.import"));
  assert.ok(description.implementedCapabilities.includes("scope.evaluate"));
  assert.ok(description.implementedCapabilities.includes("queue.enqueue"));
  assert.ok(description.implementedCapabilities.includes("queue.claimNext"));
  assert.ok(description.plannedCapabilities.includes("queue.lease-recovery"));
  assert.ok(description.plannedCapabilities.includes("crawl.execution"));
});
