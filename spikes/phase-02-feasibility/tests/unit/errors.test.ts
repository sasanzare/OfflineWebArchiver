import assert from "node:assert/strict";
import test from "node:test";
import {
  sanitizeErrorMessage,
  SpikeError,
  toStructuredFailure,
} from "../../src/spike/errors.js";

test("error sanitization removes absolute paths, file URLs, and secret-like values", () => {
  const sanitized = sanitizeErrorMessage(
    "Failed C:\\Users\\Example\\private.txt file:///C:/temp/report token=abc123",
  );
  assert.doesNotMatch(sanitized, /C:\\/);
  assert.doesNotMatch(sanitized, /file:\/\//);
  assert.doesNotMatch(sanitized, /abc123/);
  assert.match(sanitized, /\[path\]/);
  assert.match(sanitized, /\[redacted\]/);
});

test("structured failures preserve the bounded spike category", () => {
  const failure = toStructuredFailure(
    new SpikeError("SPIKE_BROWSER_NOT_FOUND", "Browser is absent."),
  );
  assert.deepEqual(failure, {
    category: "SPIKE_BROWSER_NOT_FOUND",
    message: "Browser is absent.",
    recoverable: true,
  });
});

