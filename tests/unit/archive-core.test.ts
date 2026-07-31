import assert from "node:assert/strict";
import test from "node:test";
import { createArchiveCore } from "@offline-web-archive/archive-core";

test("core exposes the Phase 4 Project capability without future crawl behavior", () => {
  const description = createArchiveCore().describeSystem();
  assert.equal(description.coreStatus, "project-foundation-ready");
  assert.ok(description.implementedCapabilities.includes("project.create"));
  assert.ok(description.implementedCapabilities.includes("project.import"));
  assert.ok(description.plannedCapabilities.includes("url.normalization"));
  assert.ok(description.plannedCapabilities.includes("crawl.execution"));
});
