import assert from "node:assert/strict";
import test from "node:test";
import { createInMemoryLogger, fixedClock, systemDescribeFixture } from "@offline-web-archive/test-support";

test("test-support provides deterministic public fixtures", () => {
  assert.equal(fixedClock()(), "2026-07-31T12:00:00.000Z");
  assert.equal(systemDescribeFixture().correlationId, "correlation-test-001");
  const logger = createInMemoryLogger();
  assert.deepEqual(logger.events, []);
});
