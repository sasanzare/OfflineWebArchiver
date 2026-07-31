import assert from "node:assert/strict";
import test from "node:test";
import { readEnvironmentConfiguration, resolveApplicationConfiguration } from "@offline-web-archive/platform";

test("configuration has safe explicit defaults", () => {
  const configuration = resolveApplicationConfiguration();
  assert.equal(configuration.applicationVersion, "0.3.0");
  assert.equal(configuration.logLevel, "info");
});

test("only the allowlisted environment setting is accepted", () => {
  assert.equal(readEnvironmentConfiguration({ OWAB_LOG_LEVEL: "warn", SECRET: "ignored" }).logLevel, "warn");
  assert.throws(() => readEnvironmentConfiguration({ OWAB_LOG_LEVEL: "verbose" }));
});
