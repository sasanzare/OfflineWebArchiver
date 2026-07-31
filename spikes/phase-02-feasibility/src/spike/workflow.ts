import { createConnection } from "node:net";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type {
  PublicRunResult,
  SpikeProgress,
  SpikeStage,
} from "../shared/contracts.js";
import {
  copyFixtureArchiveAssets,
  finalizeRun,
  prepareRunPaths,
  preserveFailedRun,
  serializeMetadata,
  writeJsonAtomic,
  writeTextAtomic,
  type ArchiveMetadata,
  type RunPaths,
} from "./archive.js";
import {
  captureRenderedSpa,
  PLAYWRIGHT_CHROMIUM_SANDBOX,
} from "./browser.js";
import { SpikeError, toStructuredFailure } from "./errors.js";
import { StructuredLogger } from "./logger.js";
import { createRunId, toPortablePath } from "./paths.js";
import {
  startArchiveServer,
  startFixtureServer,
  type ArchiveServer,
  type LoopbackServer,
} from "./servers.js";

export interface OfflinePreviewEvidence {
  expectedContentVisible: boolean;
  renderedTitle: string;
  requestUrls: string[];
  blockedUrls: string[];
  renderer: "electron" | "http-validation";
}

export interface WorkflowOptions {
  spikeRoot: string;
  fixtureRoot: string;
  browserRoot: string;
  outputRoot: string;
  packaged: boolean;
  electronStartupMs?: number;
  onProgress?(progress: SpikeProgress): void;
  verifyOfflinePreview?(
    archiveUrl: string,
    expectedText: string,
  ): Promise<OfflinePreviewEvidence>;
}

export interface WorkflowResult extends PublicRunResult {
  runtimeServer: ArchiveServer;
  absoluteRunDirectory: string;
  previewEvidence: OfflinePreviewEvidence;
}

function memorySnapshot(): { rssMiB: number; heapUsedMiB: number } {
  const usage = process.memoryUsage();
  return {
    rssMiB: Number((usage.rss / 1024 / 1024).toFixed(2)),
    heapUsedMiB: Number((usage.heapUsed / 1024 / 1024).toFixed(2)),
  };
}

function confirmPortClosed(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 750);
    socket.once("connect", () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      clearTimeout(timeout);
      resolve(true);
    });
  });
}

async function verifyThroughHttp(
  archiveUrl: string,
  expectedText: string,
): Promise<OfflinePreviewEvidence> {
  const response = await fetch(archiveUrl, {
    signal: AbortSignal.timeout(5_000),
  });
  const html = await response.text();
  return {
    expectedContentVisible: response.ok && html.includes(expectedText),
    renderedTitle: /<title>([^<]+)<\/title>/i.exec(html)?.[1] ?? "",
    requestUrls: [archiveUrl],
    blockedUrls: [],
    renderer: "http-validation",
  };
}

export async function runFeasibilityWorkflow(
  options: WorkflowOptions,
): Promise<WorkflowResult> {
  const runId = createRunId();
  const workflowStart = performance.now();
  const startedAt = new Date().toISOString();
  const logger = new StructuredLogger(runId);
  const startMemory = memorySnapshot();
  let currentStage: SpikeStage = "Preparing fixture";
  let paths: RunPaths | undefined;
  let fixture: LoopbackServer | undefined;
  let runtime: ArchiveServer | undefined;

  const progress = (stage: SpikeStage, message: string): void => {
    currentStage = stage;
    logger.info(stage, message);
    options.onProgress?.({
      runId,
      stage,
      timestamp: new Date().toISOString(),
      message,
    });
  };

  try {
    progress(
      "Preparing fixture",
      "Creating a unique run workspace and starting the synthetic loopback fixture.",
    );
    paths = await prepareRunPaths(options.outputRoot, runId);
    fixture = await startFixtureServer(options.fixtureRoot);

    const capture = await captureRenderedSpa({
      fixtureOrigin: fixture.origin,
      browserRoot: options.browserRoot,
      packaged: options.packaged,
      onStage: progress,
    });

    progress(
      "Saving archive",
      "Writing the rendered archive and evidence through temporary files.",
    );
    const metadata: ArchiveMetadata = {
      schemaVersion: "phase-02-spike-v1",
      experimental: true,
      runId,
      originalUrl: capture.originalUrl,
      finalUrl: capture.finalUrl,
      title: capture.title,
      renderStartedAt: capture.renderStartedAt,
      renderCompletedAt: capture.renderCompletedAt,
      renderDurationMs: capture.renderDurationMs,
      consoleErrorCount: capture.consoleErrors.length,
      failedRequestCount: capture.failedRequests.length,
      chromiumVersion: capture.chromiumVersion,
      browserExecutable: capture.browserExecutable,
      archiveEntry: "archive/index.html",
    };

    await Promise.all([
      writeTextAtomic(path.join(paths.archive, "index.html"), capture.html),
      writeTextAtomic(
        path.join(paths.archive, "metadata.json"),
        serializeMetadata(metadata),
      ),
      writeJsonAtomic(path.join(paths.runtime, "routes.json"), {
        schemaVersion: "phase-02-spike-routes-v1",
        experimental: true,
        runId,
        routes: capture.routes.map((route) => ({ route, archive: "archive/index.html" })),
      }),
      writeJsonAtomic(path.join(paths.evidence, "console.json"), {
        schemaVersion: "phase-02-spike-console-v1",
        runId,
        errors: capture.consoleErrors,
      }),
      writeJsonAtomic(path.join(paths.evidence, "network-failures.json"), {
        schemaVersion: "phase-02-spike-network-v1",
        runId,
        failures: capture.failedRequests,
      }),
      copyFixtureArchiveAssets(options.fixtureRoot, paths.archive),
    ]);

    await fixture.stop();
    const fixturePort = fixture.port;
    const fixtureOrigin = fixture.origin;
    fixture = undefined;
    const originalFixtureUnavailable = await confirmPortClosed(fixturePort);
    if (!originalFixtureUnavailable) {
      throw new SpikeError(
        "SPIKE_OFFLINE_VALIDATION_ERROR",
        "The original synthetic fixture origin remained reachable after shutdown.",
      );
    }

    progress(
      "Starting offline server",
      "Starting the archive server on loopback with a dynamic port.",
    );
    runtime = await startArchiveServer(paths.archive, new Set([fixturePort]));

    progress(
      "Opening offline preview",
      "Opening and validating the archived page after the original origin stopped.",
    );
    const archiveUrl = `${runtime.origin}/products/example-item`;
    const previewEvidence = await (
      options.verifyOfflinePreview ?? verifyThroughHttp
    )(archiveUrl, "Example Item archived state");

    if (!previewEvidence.expectedContentVisible) {
      throw new SpikeError(
        "SPIKE_OFFLINE_VALIDATION_ERROR",
        "The expected archived content was not visible through the offline runtime.",
      );
    }
    const fixtureContactedOffline = previewEvidence.requestUrls.some((url) =>
      url.startsWith(fixtureOrigin),
    );
    if (fixtureContactedOffline) {
      throw new SpikeError(
        "SPIKE_OFFLINE_VALIDATION_ERROR",
        "The offline preview contacted the stopped fixture origin.",
        { recoverable: false },
      );
    }

    const endMemory = memorySnapshot();
    const totalDurationMs = Math.round(performance.now() - workflowStart);
    const outputLocation = toPortablePath(path.join("runs", runId));
    const summary = {
      schemaVersion: "phase-02-spike-run-summary-v1",
      experimental: true,
      status: "passed",
      runId,
      startedAt,
      completedAt: new Date().toISOString(),
      outputLocation,
      archiveEntry: "archive/index.html",
      fixture: {
        description: "Deterministic local SPA with delayed JSON, History API routes, delayed component, and lazy image",
        originalUrl: capture.originalUrl,
        finalUrl: capture.finalUrl,
        serverStopped: true,
        originalFixtureUnavailable,
      },
      browser: {
        provider: "Playwright-managed Chromium",
        version: capture.chromiumVersion,
        executable: capture.browserExecutable,
        systemBrowserFallback: false,
        launchDownloadAllowed: false,
        chromiumSandbox: PLAYWRIGHT_CHROMIUM_SANDBOX,
      },
      render: {
        strategy: "explicit completion marker + expected content + 350 ms DOM quiet window",
        durationMs: capture.renderDurationMs,
        routes: capture.routes,
        consoleErrors: capture.consoleErrors.length,
        failedRequests: capture.failedRequests.length,
      },
      offline: {
        host: runtime.host,
        port: runtime.port,
        originalFixtureContacted: false,
        expectedContentVisible: previewEvidence.expectedContentVisible,
        renderedTitle: previewEvidence.renderedTitle,
        renderer: previewEvidence.renderer,
        blockedRequestCount: previewEvidence.blockedUrls.length,
      },
      timing: {
        electronStartupMs: options.electronStartupMs ?? "NOT_MEASURED",
        totalWorkflowMs: totalDurationMs,
      },
      memory: {
        method: "Node process.memoryUsage for the workflow host; not total application-tree memory",
        start: startMemory,
        end: endMemory,
      },
      environment: {
        platform: process.platform,
        architecture: process.arch,
        nodeRuntime: process.versions.node,
        packaged: options.packaged,
      },
    };

    progress("Completed", "The experimental feasibility workflow completed.");
    await Promise.all([
      writeJsonAtomic(path.join(paths.evidence, "run-summary.json"), summary),
      logger.flush(path.join(paths.logs, "events.jsonl")),
    ]);
    await finalizeRun(paths, runId);
    runtime.setArchiveRoot(path.join(paths.finalRun, "archive"));

    return {
      runId,
      status: "passed",
      archiveUrl,
      outputLocation,
      chromiumVersion: capture.chromiumVersion,
      renderDurationMs: capture.renderDurationMs,
      totalDurationMs,
      consoleErrorCount: capture.consoleErrors.length,
      failedRequestCount: capture.failedRequests.length,
      originalFixtureUnavailable,
      offlineContentVisible: previewEvidence.expectedContentVisible,
      runtimeServer: runtime,
      absoluteRunDirectory: paths.finalRun,
      previewEvidence,
    };
  } catch (error) {
    const failure = toStructuredFailure(error);
    logger.error(currentStage, failure.category, failure.message);
    if (fixture !== undefined) {
      await fixture.stop().catch(() => undefined);
    }
    if (runtime !== undefined) {
      await runtime.stop().catch(() => undefined);
    }
    if (paths !== undefined) {
      await mkdir(path.join(paths.temporaryRun, "logs"), { recursive: true }).catch(
        () => undefined,
      );
      await logger.flush(path.join(paths.temporaryRun, "logs", "events.jsonl")).catch(
        () => undefined,
      );
      await preserveFailedRun(paths, runId, failure).catch(() => undefined);
    }
    throw error;
  }
}
