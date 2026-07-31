import assert from "node:assert/strict";
import test from "node:test";
import { createArchiveCore } from "@offline-web-archive/archive-core";

test("core exposes only the Phase 3 architecture capability", () => {
  const description = createArchiveCore().describeSystem();
  assert.deepEqual(description.implementedCapabilities, ["system.describe"]);
  assert.ok(description.plannedCapabilities.includes("crawl.execution"));
  assert.equal(description.coreStatus, "architecture-ready");
});
