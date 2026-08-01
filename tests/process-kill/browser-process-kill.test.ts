import assert from "node:assert/strict";
import { spawn, execFileSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { startRenderFixtureServer } from "../support/render-fixture-server.js";

interface ChromeProcess { ProcessId: number; CommandLine: string | null; ExecutablePath: string | null }

function chromeProcesses(): ChromeProcess[] {
  const command = "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Select-Object ProcessId,CommandLine,ExecutablePath | ConvertTo-Json -Compress";
  const output = execFileSync("powershell.exe", ["-NoProfile", "-Command", command], { encoding: "utf8", windowsHide: true }).trim();
  if (output === "") return [];
  const parsed = JSON.parse(output) as ChromeProcess | ChromeProcess[];
  return Array.isArray(parsed) ? parsed : [parsed];
}

function waitForLine(child: ChildProcessWithoutNullStreams, prefix: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${prefix}; output=${buffer}`)), timeoutMs);
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      const line = buffer.split(/\r?\n/).find((entry) => entry.startsWith(prefix));
      if (line !== undefined) {
        clearTimeout(timeout);
        child.stdout.off("data", onData);
        resolve(line.slice(prefix.length));
      }
    };
    child.stdout.on("data", onData);
    child.once("error", (error) => { clearTimeout(timeout); reject(error); });
  });
}

function waitForExit(child: ChildProcessWithoutNullStreams, timeoutMs: number): Promise<void> {
  if (child.exitCode !== null) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for crash child cleanup")), timeoutMs);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function waitForOwnedProcesses(existing: Set<number>, timeoutMs = 15_000): Promise<ChromeProcess[]> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const values = chromeProcesses().filter((entry) => !existing.has(entry.ProcessId) && entry.ExecutablePath?.includes("OfflineWebArchiver\\.runtime\\browsers") === true);
    if (values.some((entry) => entry.CommandLine?.includes("--type=renderer") === true) && values.some((entry) => !entry.CommandLine?.includes("--type="))) return values;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Owned Chromium process tree did not become observable");
}

function terminateOwnedProcesses(existing: Set<number>, mode: "page" | "browser"): number[] {
  const existingIds = [...existing].join(",");
  const typeFilter = mode === "page"
    ? "$_.CommandLine -like '*--type=renderer*'"
    : "$_.CommandLine -notlike '*--type=*'";
  const command = `$existing = @(${existingIds}); Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $existing -notcontains [int]$_.ProcessId -and $_.ExecutablePath -like '*OfflineWebArchiver\\.runtime\\browsers*' -and ${typeFilter} } | ForEach-Object { $targetId = [int]$_.ProcessId; Stop-Process -Id $targetId -Force -ErrorAction Stop; $targetId } | ConvertTo-Json -Compress`;
  const output = execFileSync("powershell.exe", ["-NoProfile", "-Command", command], { encoding: "utf8", windowsHide: true }).trim();
  if (output === "") return [];
  const parsed = JSON.parse(output) as number | number[];
  return Array.isArray(parsed) ? parsed : [parsed];
}

for (const mode of ["page", "browser"] as const) {
  test(`actual ${mode} process termination is classified and leaves recoverable durable state`, { skip: process.platform !== "win32" }, async () => {
    const server = await startRenderFixtureServer();
    const root = await mkdtemp(path.join(tmpdir(), `owa-${mode}-crash-`));
    const projectPath = path.join(root, "project");
    const existing = new Set(chromeProcesses().map((entry) => entry.ProcessId));
    const childScript = fileURLToPath(new URL("../support/render-crash-child.js", import.meta.url));
    const child = spawn(process.execPath, [childScript, projectPath, server.origin], { cwd: process.cwd(), stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
    try {
      await waitForLine(child, "CRASH_CHILD_READY=", 15_000);
      await server.waitForRequest("/page-active");
      await waitForOwnedProcesses(existing);
      const terminated = terminateOwnedProcesses(existing, mode);
      assert.ok(terminated.length > 0, `No live ${mode} process was terminated`);
      const resultLine = await waitForLine(child, "CRASH_CHILD_RESULT=", 20_000);
      const result = JSON.parse(resultLine) as { status: string; errorCode: string | null; jobState: string };
      await waitForExit(child, 20_000);
      assert.equal(result.status, "error", stderr);
      assert.equal(result.errorCode, mode === "page" ? "PAGE_CRASHED" : "BROWSER_CRASHED", stderr);
      assert.ok(["retrying", "failed"].includes(result.jobState));
    } finally {
      if (child.exitCode === null) child.kill("SIGKILL");
      await server.close();
      await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  });
}
