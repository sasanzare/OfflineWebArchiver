import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runFeasibilityWorkflow } from "../../src/spike/workflow.js";

const spikeRoot = path.resolve(__dirname, "..", "..", "..");

test("real Playwright workflow renders, saves, stops origin, and serves offline", { timeout: 60_000 }, async () => {
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "p02-workflow-test-"));
  const result = await runFeasibilityWorkflow({
    spikeRoot,
    fixtureRoot: path.join(spikeRoot, "fixtures", "spa"),
    browserRoot: path.join(spikeRoot, ".playwright-browsers"),
    outputRoot,
    packaged: false,
  });
  try {
    assert.equal(result.status, "passed");
    assert.equal(result.originalFixtureUnavailable, true);
    assert.equal(result.offlineContentVisible, true);
    assert.equal(result.consoleErrorCount, 0);
    assert.equal(result.failedRequestCount, 0);
    assert.match(result.chromiumVersion, /^\d+\./);
    assert.deepEqual(result.previewEvidence.blockedUrls, []);

    const runRoot = path.join(outputRoot, result.outputLocation);
    const html = await readFile(path.join(runRoot, "archive", "index.html"), "utf8");
    assert.match(html, /Example Item archived state/);
    assert.match(html, /Catalog loaded: 2 items/);
    assert.match(html, /Delayed component ready/);
    assert.match(html, /data-loaded="true"/);
    assert.doesNotMatch(html, /<script/i);
    assert.doesNotMatch(html, /(?:^|["\s])[A-Za-z]:[\\/]/m);

    const metadataText = await readFile(path.join(runRoot, "archive", "metadata.json"), "utf8");
    const metadata = JSON.parse(metadataText) as { runId: string; browserExecutable: string };
    assert.equal(metadata.runId, result.runId);
    assert.match(metadata.browserExecutable, /^\.playwright-browsers\//);
    assert.doesNotMatch(metadataText, /(?:^|["\s])[A-Za-z]:[\\/]/m);

    const summary = JSON.parse(
      await readFile(path.join(runRoot, "evidence", "run-summary.json"), "utf8"),
    ) as { browser: { chromiumSandbox: boolean } };
    assert.equal(summary.browser.chromiumSandbox, true);

    await stat(path.join(runRoot, "archive", "styles.css"));
    await stat(path.join(runRoot, "archive", "lazy.svg"));
    const offline = await fetch(result.archiveUrl).then((response) => response.text());
    assert.match(offline, /Example Item archived state/);
  } finally {
    await result.runtimeServer.stop();
    await rm(outputRoot, { recursive: true, force: true });
  }
});
