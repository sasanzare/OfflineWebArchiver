import {
  app,
  BrowserWindow,
  ipcMain,
  session,
  shell,
  type IpcMainInvokeEvent,
} from "electron";
import path from "node:path";
import { writeJsonAtomic } from "../spike/archive.js";
import { toStructuredFailure } from "../spike/errors.js";
import {
  resolveBrowserRoot,
  resolveFixtureRoot,
} from "../spike/paths.js";
import {
  runFeasibilityWorkflow,
  type OfflinePreviewEvidence,
  type WorkflowResult,
} from "../spike/workflow.js";
import type { PreloadApi, PublicRunResult } from "../shared/contracts.js";
import { IPC_CHANNELS } from "../shared/ipc.js";

const processStartedAt = performance.now();
const automation = process.argv.includes("--automation");
let mainWindow: BrowserWindow | null = null;
let previewWindow: BrowserWindow | null = null;
let activeRun: WorkflowResult | null = null;
let runInProgress = false;
let quitting = false;

const MAIN_WEB_PREFERENCES = Object.freeze({
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  webSecurity: true,
});

app.enableSandbox();

function spikeRoot(): string {
  return app.isPackaged
    ? app.getAppPath()
    : path.resolve(__dirname, "..", "..", "..");
}

function outputRoot(): string {
  const automationOverride = automation
    ? process.env.OWAB_SPIKE_OUTPUT_ROOT
    : undefined;
  if (automationOverride !== undefined && automationOverride.trim() !== "") {
    return path.resolve(automationOverride);
  }
  return app.isPackaged
    ? path.join(app.getPath("userData"), "phase-02-feasibility-output")
    : path.join(spikeRoot(), "output");
}

function configureRestrictedSession(targetSession: Electron.Session): void {
  targetSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  targetSession.setPermissionCheckHandler(() => false);
}

function secureWindow(window: BrowserWindow, allowedOrigin: string): void {
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => {
    let permitted = false;
    try {
      permitted = new URL(url).origin === allowedOrigin;
    } catch {
      permitted = false;
    }
    if (!permitted) event.preventDefault();
  });
  window.webContents.session.on("will-download", (event) => event.preventDefault());
}

async function verifyOfflineInElectron(
  archiveUrl: string,
  expectedText: string,
): Promise<OfflinePreviewEvidence> {
  previewWindow?.destroy();
  const allowedOrigin = new URL(archiveUrl).origin;
  const partition = `phase02-preview-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const previewSession = session.fromPartition(partition, { cache: false });
  configureRestrictedSession(previewSession);

  const requestUrls: string[] = [];
  const blockedUrls: string[] = [];
  previewSession.webRequest.onBeforeRequest({ urls: ["*://*/*"] }, (details, callback) => {
    let allowed = false;
    try {
      allowed = new URL(details.url).origin === allowedOrigin;
    } catch {
      allowed = false;
    }
    if (allowed) {
      requestUrls.push(details.url);
    } else {
      blockedUrls.push(details.url);
    }
    callback({ cancel: !allowed });
  });

  const window = new BrowserWindow({
    width: 1120,
    height: 780,
    show: false,
    title: "Experimental Offline Archive Preview",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      partition,
    },
  });
  previewWindow = window;
  secureWindow(window, allowedOrigin);

  try {
    await window.loadURL(archiveUrl);
    const rendered = await window.webContents.executeJavaScript(
      `({ title: document.title, text: document.body.innerText })`,
      true,
    ) as { title: string; text: string };
    const expectedContentVisible = rendered.text.includes(expectedText);
    if (expectedContentVisible && !automation) {
      window.show();
    }
    return {
      expectedContentVisible,
      renderedTitle: rendered.title,
      requestUrls,
      blockedUrls,
      renderer: "electron",
    };
  } catch (error) {
    window.destroy();
    if (previewWindow === window) previewWindow = null;
    throw error;
  }
}

function createMainWindow(): BrowserWindow {
  const preloadPath = path.join(__dirname, "..", "preload", "index.js");
  const rendererPath = path.join(__dirname, "..", "renderer", "index.html");
  const window = new BrowserWindow({
    width: 980,
    height: 760,
    show: !automation,
    title: "Offline Web Archive Builder — Phase 2 Spike",
    webPreferences: {
      preload: preloadPath,
      ...MAIN_WEB_PREFERENCES,
    },
  });
  configureRestrictedSession(window.webContents.session);
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => {
    if (url !== window.webContents.getURL()) event.preventDefault();
  });
  void window.loadFile(rendererPath);
  window.on("closed", () => {
    if (mainWindow === window) mainWindow = null;
  });
  return window;
}

function assertMainSender(event: IpcMainInvokeEvent): void {
  if (
    mainWindow === null ||
    event.sender.id !== mainWindow.webContents.id ||
    event.senderFrame?.url !== mainWindow.webContents.getURL()
  ) {
    throw new Error("Rejected IPC sender.");
  }
}

function publicResult(result: WorkflowResult): PublicRunResult {
  const {
    runtimeServer: _runtimeServer,
    absoluteRunDirectory: _absoluteRunDirectory,
    previewEvidence: _previewEvidence,
    ...safe
  } = result;
  return safe;
}

function registerIpc(): void {
  ipcMain.handle(IPC_CHANNELS.run, async (event) => {
    assertMainSender(event);
    if (runInProgress) {
      return {
        ok: false,
        failure: {
          category: "SPIKE_CONFIGURATION_ERROR",
          message: "A feasibility run is already in progress.",
          recoverable: true,
        },
      };
    }

    runInProgress = true;
    try {
      if (activeRun !== null) {
        await activeRun.runtimeServer.stop();
        activeRun = null;
      }
      previewWindow?.destroy();
      previewWindow = null;

      const root = spikeRoot();
      const result = await runFeasibilityWorkflow({
        spikeRoot: root,
        fixtureRoot: resolveFixtureRoot({
          packaged: app.isPackaged,
          resourcesPath: process.resourcesPath,
          spikeRoot: root,
        }),
        browserRoot: resolveBrowserRoot({
          packaged: app.isPackaged,
          resourcesPath: process.resourcesPath,
          spikeRoot: root,
        }),
        outputRoot: outputRoot(),
        packaged: app.isPackaged,
        electronStartupMs: Math.round(performance.now() - processStartedAt),
        onProgress(progress) {
          const progressWindow = mainWindow;
          if (progressWindow !== null && !progressWindow.isDestroyed()) {
            progressWindow.webContents.send(IPC_CHANNELS.progress, progress);
          }
        },
        verifyOfflinePreview: verifyOfflineInElectron,
      });
      activeRun = result;
      return { ok: true, result: publicResult(result) };
    } catch (error) {
      return { ok: false, failure: toStructuredFailure(error) };
    } finally {
      runInProgress = false;
    }
  });

  ipcMain.handle(IPC_CHANNELS.openOutput, async (event) => {
    assertMainSender(event);
    if (activeRun === null) return false;
    return (await shell.openPath(activeRun.absoluteRunDirectory)) === "";
  });

  ipcMain.handle(IPC_CHANNELS.reopenPreview, async (event) => {
    assertMainSender(event);
    if (activeRun === null) return false;
    if (previewWindow !== null && !previewWindow.isDestroyed()) {
      previewWindow.show();
      previewWindow.focus();
      return true;
    }
    const evidence = await verifyOfflineInElectron(
      activeRun.archiveUrl,
      "Example Item archived state",
    );
    return evidence.expectedContentVisible;
  });

  ipcMain.handle(IPC_CHANNELS.runtimeInfo, (event) => {
    assertMainSender(event);
    return { experimental: true as const, packaged: app.isPackaged };
  });
}

async function waitForRendererAutomation(): Promise<{
  progressStages: string[];
  result: PublicRunResult | null;
  error: string | null;
}> {
  if (mainWindow === null) throw new Error("Main window is unavailable.");
  const window = mainWindow;
  await window.webContents.executeJavaScript(
    `document.querySelector('#run-button').click(); true`,
    true,
  );
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const state = await window.webContents.executeJavaScript(
      `window.__phase02AutomationState`,
      true,
    ) as {
      progressStages: string[];
      result: PublicRunResult | null;
      error: string | null;
    };
    if (state.result !== null || state.error !== null) return state;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Renderer automation timed out waiting for a structured result.");
}

async function runAutomation(): Promise<void> {
  if (mainWindow === null) throw new Error("Main window is unavailable.");
  await new Promise<void>((resolve) => {
    if (mainWindow?.webContents.isLoading()) {
      mainWindow.webContents.once("did-finish-load", () => resolve());
    } else {
      resolve();
    }
  });
  const bridgeKeys = await mainWindow.webContents.executeJavaScript(
    `Object.keys(window.phase02Spike).sort()`,
    true,
  ) as string[];
  const rendererBoundary = await mainWindow.webContents.executeJavaScript(
    `({ requireType: typeof require, processType: typeof process })`,
    true,
  ) as { requireType: string; processType: string };
  const state = await waitForRendererAutomation();
  const report = {
    schemaVersion: "phase-02-electron-smoke-v1",
    experimental: true,
    status: state.result !== null && state.error === null ? "passed" : "failed",
    packaged: app.isPackaged,
    bridgeKeys,
    progressStages: state.progressStages,
    result: state.result,
    rendererError: state.error,
    security: {
      contextIsolation: MAIN_WEB_PREFERENCES.contextIsolation,
      nodeIntegration: MAIN_WEB_PREFERENCES.nodeIntegration,
      sandbox: MAIN_WEB_PREFERENCES.sandbox,
      rendererRequireType: rendererBoundary.requireType,
      rendererProcessType: rendererBoundary.processType,
    },
    runtime: {
      electron: process.versions.electron,
      node: process.versions.node,
      chrome: process.versions.chrome,
    },
    processMetrics: app.getAppMetrics().map((metric) => ({
      type: metric.type,
      cpuPercent: metric.cpu.percentCPUUsage,
      workingSetSizeKiB: metric.memory.workingSetSize,
      peakWorkingSetSizeKiB: metric.memory.peakWorkingSetSize,
    })),
  };
  await writeJsonAtomic(path.join(outputRoot(), "automation-result.json"), report);
  process.stdout.write(
    `PHASE02_AUTOMATION_RESULT=${report.status};PACKAGED=${String(app.isPackaged)}\n`,
  );
  if (activeRun !== null) await activeRun.runtimeServer.stop();
  activeRun = null;
  app.exit(report.status === "passed" ? 0 : 1);
}

app.whenReady().then(async () => {
  registerIpc();
  mainWindow = createMainWindow();
  if (automation) {
    try {
      await runAutomation();
    } catch (error) {
      await writeJsonAtomic(path.join(outputRoot(), "automation-result.json"), {
        schemaVersion: "phase-02-electron-smoke-v1",
        experimental: true,
        status: "failed",
        failure: toStructuredFailure(error),
      }).catch(() => undefined);
      process.stderr.write(`PHASE02_AUTOMATION_RESULT=failed\n`);
      app.exit(1);
    }
  }
});

app.on("window-all-closed", () => {
  if (!quitting) app.quit();
});

app.on("before-quit", (event) => {
  if (quitting || activeRun === null) return;
  event.preventDefault();
  quitting = true;
  void activeRun.runtimeServer.stop().finally(() => {
    activeRun = null;
    app.quit();
  });
});
