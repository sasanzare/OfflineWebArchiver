import assert from "node:assert/strict";
import test from "node:test";
import { createDevelopmentLogger, redactMetadata } from "@offline-web-archive/observability";

test("structured metadata redacts secrets recursively", () => {
  const value = redactMetadata({ token: "unsafe", nested: { password: "unsafe", safe: "visible" } });
  assert.deepEqual(value, { token: "[redacted]", nested: { password: "[redacted]", safe: "visible" } });
});

test("development logger emits one JSON event", () => {
  const lines: string[] = [];
  createDevelopmentLogger((line) => lines.push(line)).log({
    timestamp: "2026-07-31T12:00:00.000Z",
    level: "info",
    component: "test",
    correlationId: "correlation-1",
    eventName: "test.completed",
  });
  assert.equal(lines.length, 1);
  assert.equal(JSON.parse(lines[0] ?? "{}").correlationId, "correlation-1");
});
