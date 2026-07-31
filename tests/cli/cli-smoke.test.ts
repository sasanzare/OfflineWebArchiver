import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

const executable = path.resolve("apps/cli/dist/index.js");

function run(arguments_: readonly string[]) {
  return spawnSync(process.execPath, [executable, ...arguments_], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, OWAB_LOG_LEVEL: "error" },
  });
}

test("built CLI executes Project, Profile, Scope, and persistent Queue operations", () => {
  const root = mkdtempSync(path.join(tmpdir(), "owa-cli-"));
  const project = path.join(root, "project");
  const archive = path.join(root, "project.zip");
  const imported = path.join(root, "imported");
  try {
    const help = run(["--help"]);
    assert.equal(help.status, 0);
    assert.match(help.stdout, /project create/);
    assert.equal(run(["--version"]).stdout.trim(), "0.6.0");
    const describe = run(["system", "describe", "--json"]);
    assert.equal(describe.status, 0, describe.stderr);
    assert.equal(JSON.parse(describe.stdout).result.coreStatus, "queue-foundation-ready");
    const create = run(["project", "create", project, "--name", "CLI Project", "--slug", "cli-project", "--json"]);
    assert.equal(create.status, 0, create.stderr);
    const createdProject = JSON.parse(create.stdout).result.project;
    const projectId = createdProject.projectId;
    const runId = createdProject.runId;
    const validate = run(["project", "validate", project, "--json"]);
    assert.equal(validate.status, 0, validate.stderr);
    assert.equal(JSON.parse(validate.stdout).result.report.valid, true);
    const profile = run(["profile", "create", project, "--name", "CLI Profile", "--seed", "https://example.com/", "--json"]);
    assert.equal(profile.status, 0, profile.stderr);
    assert.equal(JSON.parse(profile.stdout).result.profile.sequence, 1);
    const profilePath = path.join(project, "profile", "config.json");
    const approvedProfile = JSON.parse(readFileSync(profilePath, "utf8"));
    approvedProfile.authorization = { status: "approved", legalBasisReference: "AUTH-CLI-SMOKE", approvedBy: ["cli-smoke"], approvedAt: "2026-07-31T12:00:00.000Z", expiresAt: null };
    const approvedConfigPath = path.join(root, "approved-profile.json");
    writeFileSync(approvedConfigPath, `${JSON.stringify(approvedProfile, null, 2)}\n`);
    const profileUpdate = run(["profile", "update", project, approvedConfigPath, "--json"]);
    assert.equal(profileUpdate.status, 0, profileUpdate.stderr);
    const profileRevision = JSON.parse(profileUpdate.stdout).result.profile.revisionId;
    const profileValidation = run(["profile", "validate", project, "--json"]);
    assert.equal(profileValidation.status, 0, profileValidation.stderr);
    const scope = run(["scope", "explain", project, "https://example.com/docs?utm_source=cli", "--json"]);
    assert.equal(scope.status, 0, scope.stderr);
    assert.equal(JSON.parse(scope.stdout).result.decision.identityUrl, "https://example.com/docs");
    const enqueue = run(["queue", "enqueue", project, "https://example.com/docs?utm_source=cli", "--run", runId, "--profile-revision", profileRevision, "--idempotency-key", "cli-enqueue-001", "--json"]);
    assert.equal(enqueue.status, 0, enqueue.stderr);
    const enqueued = JSON.parse(enqueue.stdout).result.enqueue;
    assert.equal(enqueued.outcome, "created");
    const duplicate = run(["queue", "enqueue", project, "https://example.com/docs?utm_source=duplicate", "--run", runId, "--profile-revision", profileRevision, "--idempotency-key", "cli-enqueue-002", "--json"]);
    assert.equal(JSON.parse(duplicate.stdout).result.enqueue.outcome, "existing");
    const list = run(["queue", "list", project, "--run", runId, "--limit", "10", "--json"]);
    assert.equal(list.status, 0, list.stderr);
    assert.equal(JSON.parse(list.stdout).result.jobs.length, 1);
    const show = run(["queue", "show", project, enqueued.job.jobId, "--run", runId, "--json"]);
    assert.equal(show.status, 0, show.stderr);
    const claim = run(["queue", "claim-next", project, "--run", runId, "--claimed-by", "cli-smoke", "--idempotency-key", "cli-claim-001", "--json"]);
    assert.equal(claim.status, 0, claim.stderr);
    const claimed = JSON.parse(claim.stdout).result.job;
    const complete = run(["queue", "complete", project, claimed.jobId, "--run", runId, "--claim-token", claimed.claimToken, "--completion-key", "cli-complete-001", "--idempotency-key", "cli-complete-operation-001", "--json"]);
    assert.equal(complete.status, 0, complete.stderr);
    assert.equal(JSON.parse(complete.stdout).result.job.state, "completed");
    const stats = run(["queue", "stats", project, "--run", runId, "--json"]);
    assert.equal(stats.status, 0, stats.stderr);
    assert.equal(JSON.parse(stats.stdout).result.statistics.completed, 1);
    const history = run(["queue", "history", project, claimed.jobId, "--run", runId, "--json"]);
    assert.equal(history.status, 0, history.stderr);
    assert.equal(JSON.parse(history.stdout).result.history.attempts.length, 1);
    const retryEnqueue = run(["queue", "enqueue", project, "https://example.com/retry", "--run", runId, "--profile-revision", profileRevision, "--idempotency-key", "cli-enqueue-retry", "--priority", "1000", "--max-attempts", "2", "--json"]);
    assert.equal(retryEnqueue.status, 0, retryEnqueue.stderr);
    const retryClaimResult = run(["queue", "claim-next", project, "--run", runId, "--claimed-by", "cli-smoke", "--idempotency-key", "cli-claim-retry", "--json"]);
    assert.equal(retryClaimResult.status, 0, retryClaimResult.stderr);
    const retryClaim = JSON.parse(retryClaimResult.stdout).result.job;
    const fail = run(["queue", "fail", project, retryClaim.jobId, "--run", runId, "--claim-token", retryClaim.claimToken, "--failure-key", "cli-failure-001", "--failure-code", "CLI_TEST_RETRY", "--failure-category", "platform", "--message", "controlled-cli-test", "--retryable", "--next-eligible-at", "2026-07-31T12:10:00.000Z", "--idempotency-key", "cli-fail-operation", "--json"]);
    assert.equal(fail.status, 0, fail.stderr);
    assert.equal(JSON.parse(fail.stdout).result.job.state, "retrying");
    const retry = run(["queue", "retry", project, retryClaim.jobId, "--run", runId, "--next-eligible-at", "2026-07-31T12:20:00.000Z", "--reason", "CLI_TEST_DELAY", "--idempotency-key", "cli-retry-operation", "--json"]);
    assert.equal(retry.status, 0, retry.stderr);
    const release = run(["queue", "release-due", project, "--run", runId, "--due-at", "2026-07-31T12:20:00.000Z", "--limit", "10", "--idempotency-key", "cli-release-operation", "--json"]);
    assert.equal(release.status, 0, release.stderr);
    assert.equal(JSON.parse(release.stdout).result.jobs.length, 1);
    const humanStats = run(["queue", "stats", project, "--run", runId]);
    assert.equal(humanStats.status, 0, humanStats.stderr);
    assert.match(humanStats.stdout, /Queue Jobs:/);
    const invalidFilter = run(["queue", "list", project, "--run", runId, "--state", "leased", "--limit", "10"]);
    assert.equal(invalidFilter.status, 3);
    const open = run(["project", "open", project, "--json"]);
    assert.equal(open.status, 0, open.stderr);
    const info = run(["project", "info", project, "--json"]);
    assert.equal(info.status, 0, info.stderr);
    assert.equal(JSON.parse(info.stdout).result.compatibility.compatible, true);
    const exported = run(["project", "export", project, archive, "--json"]);
    assert.equal(exported.status, 0, exported.stderr);
    const importedResult = run(["project", "import", archive, imported, "--json"]);
    assert.equal(importedResult.status, 0, importedResult.stderr);
    assert.equal(JSON.parse(importedResult.stdout).result.import.project.projectId, projectId);
    const importedValidation = run(["project", "validate", imported, "--json"]);
    assert.equal(importedValidation.status, 0, importedValidation.stderr);
    assert.equal(run(["crawl"]).status, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
