import { readdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { repositoryRoot, runTypeScriptBuild } from "../build/typescript.mjs";

const suite = process.argv[2] ?? "all";
const suites = new Set(["all", "unit", "integration", "concurrency", "process-kill", "recovery", "phase17", "phase18", "browser", "rendering", "electron", "cli", "secrets", "okf"]);
const recoveryTests = [
  "unit/recovery.test.js",
  "integration/recovery-lifecycle.test.js",
  "integration/partial-file-recovery.test.js",
  "concurrency/recovery-concurrency.test.js",
  "process-kill/recovery-process-kill.test.js",
];
const browserTests = [
  "browser/browser-runtime.test.js",
  "browser/interaction.test.js",
  "browser/session.test.js",
  "browser/otp-flow.test.js",
  "browser/service-worker-policy.test.js",
  "process-kill/browser-process-kill.test.js",
];
const renderingTests = [
  "rendering/render-engine.test.js",
  "integration/render-lifecycle.test.js",
  "integration/render-persistence-faults.test.js",
  "process-kill/browser-process-kill.test.js",
];
const phase17Tests = [
  "unit/assets.test.js",
  "integration/asset-download.test.js",
  "integration/asset-path-safety.test.js",
  "concurrency/asset-concurrency.test.js",
];
const phase18Tests = [
  "unit/rewrite.test.js",
  "integration/rewrite-persistence.test.js",
];
const packageTests = new Map([
  ["package:contracts", ["unit/contracts.test.js"]],
  ["package:archive-core", ["unit/archive-core.test.js", "unit/assets.test.js", "unit/proxy.test.js", "unit/scheduler.test.js", "unit/rewrite.test.js"]],
  ["package:queue", ["unit/queue.test.js", "integration/queue-lifecycle.test.js", "concurrency/queue-concurrency.test.js"]],
  ["package:recovery", ["unit/recovery.test.js", "integration/recovery-lifecycle.test.js", "concurrency/recovery-concurrency.test.js", "process-kill/recovery-process-kill.test.js"]],
  ["package:scope-engine", ["unit/scope-engine.test.js"]],
  ["package:project-format", ["unit/project-format.test.js"]],
  ["package:persistence-sqlite", ["unit/persistence-sqlite.test.js", "integration/project-lifecycle.test.js", "integration/profile-lifecycle.test.js", "integration/queue-lifecycle.test.js", "integration/render-persistence-faults.test.js", "integration/proxy-lifecycle.test.js", "integration/scheduler-lifecycle.test.js", "integration/asset-download.test.js", "integration/rewrite-persistence.test.js", "concurrency/queue-concurrency.test.js", "concurrency/asset-concurrency.test.js"]],
  ["package:observability", ["unit/observability.test.js"]],
  ["package:secrets", ["secrets/secret-store.test.js"]],
  ["package:platform", ["unit/platform.test.js"]],
  ["package:application-service", ["integration/application-service.test.js", "integration/render-lifecycle.test.js", "integration/proxy-lifecycle.test.js", "integration/session-lifecycle.test.js"]],
  ["package:browser-runtime", ["unit/authentication-route.test.js", "browser/browser-runtime.test.js", "browser/session.test.js", "browser/otp-flow.test.js", "browser/service-worker-policy.test.js", "process-kill/browser-process-kill.test.js"]],
  ["package:rendering", ["rendering/render-engine.test.js", "integration/render-lifecycle.test.js", "integration/render-persistence-faults.test.js"]],
  ["package:test-support", ["unit/test-support.test.js"]],
  ["package:cli", ["unit/cli.test.js", "cli/cli-smoke.test.js", "cli/cli-render-smoke.test.js"]],
  ["package:desktop", ["integration/desktop-transport.test.js", "electron/desktop-smoke.test.js"]],
]);
if (!suites.has(suite) && !packageTests.has(suite)) {
  process.stderr.write(`Unknown test suite: ${suite}\n`);
  process.exit(2);
}

runTypeScriptBuild();
await import("../build/build-desktop.mjs");
await rm(path.join(repositoryRoot, ".build-tests"), { recursive: true, force: true });
runTypeScriptBuild(["tsconfig.test.json"]);

async function collect(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(target)));
    if (entry.isFile() && entry.name.endsWith(".test.js")) files.push(target);
  }
  return files;
}

const testRoot = path.join(repositoryRoot, ".build-tests", "tests");
const selected = suite === "all"
  ? await collect(testRoot)
  : suite === "recovery"
    ? recoveryTests.map((name) => path.join(testRoot, name))
  : suite === "browser"
    ? browserTests.map((name) => path.join(testRoot, name))
  : suite === "rendering"
    ? renderingTests.map((name) => path.join(testRoot, name))
  : suite === "phase17"
    ? phase17Tests.map((name) => path.join(testRoot, name))
  : suite === "phase18"
    ? phase18Tests.map((name) => path.join(testRoot, name))
  : packageTests.has(suite)
    ? packageTests.get(suite).map((name) => path.join(testRoot, name))
    : await collect(path.join(testRoot, suite));
selected.sort();
if (selected.length === 0) {
  process.stderr.write(`No compiled tests found for suite ${suite}.\n`);
  process.exit(2);
}
const result = spawnSync(
  process.execPath,
  ["--test", "--test-isolation=none", "--test-concurrency=1", ...selected],
  {
    cwd: repositoryRoot,
    stdio: "inherit",
    env: { ...process.env, OWAB_LOG_LEVEL: "error", OWAB_TEST_MODE: "1" },
  },
);
if (result.error !== undefined) throw result.error;
process.exit(result.status ?? 1);
