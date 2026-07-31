import path from "node:path";
import { pathToFileURL } from "node:url";
import { app, BrowserWindow, ipcMain, type IpcMainInvokeEvent } from "electron";
import { createApplicationService } from "@offline-web-archive/application-service";
import { parseResponseEnvelope } from "@offline-web-archive/contracts";
import { createDevelopmentLogger } from "@offline-web-archive/observability";
import {
  readEnvironmentConfiguration,
  readRuntimePlatformInfo,
} from "@offline-web-archive/platform";
import { createDesktopTransportHandler } from "./ipc-transport.js";

export const DESCRIBE_CHANNEL = "offline-archive:system-describe";
export const MAIN_WINDOW_SECURITY = Object.freeze({
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  webSecurity: true,
});

const architectureSmoke = process.argv.includes("--architecture-smoke");
let mainWindow: BrowserWindow | null = null;
let expectedRendererUrl = "";

app.enableSandbox();

const configuration = readEnvironmentConfiguration(process.env);
const runtimePlatform = readRuntimePlatformInfo();
const service = createApplicationService({
  configuration,
  ...runtimePlatform,
  logger: createDevelopmentLogger((line) => process.stderr.write(`${line}\n`)),
});
const transport = createDesktopTransportHandler(service);

function senderIsAuthorized(event: IpcMainInvokeEvent): boolean {
  const window = mainWindow;
  return (
    window !== null &&
    !window.isDestroyed() &&
    event.sender.id === window.webContents.id &&
    event.senderFrame === window.webContents.mainFrame &&
    event.senderFrame.url === expectedRendererUrl
  );
}

function applySessionRestrictions(window: BrowserWindow): void {
  const targetSession = window.webContents.session;
  targetSession.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(false);
  });
  targetSession.setPermissionCheckHandler(() => false);
  targetSession.on("will-download", (event) => event.preventDefault());
}

function applyNavigationRestrictions(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, targetUrl) => {
    if (targetUrl !== expectedRendererUrl) event.preventDefault();
  });
  window.webContents.on("will-attach-webview", (event) => event.preventDefault());
}

function createMainWindow(): BrowserWindow {
  const preloadPath = path.join(__dirname, "preload.cjs");
  const rendererPath = path.join(__dirname, "renderer", "index.html");
  expectedRendererUrl = pathToFileURL(rendererPath).href;
  const window = new BrowserWindow({
    width: 980,
    height: 720,
    show: !architectureSmoke,
    title: "Offline Web Archive Builder",
    webPreferences: {
      preload: preloadPath,
      ...MAIN_WINDOW_SECURITY,
    },
  });
  applySessionRestrictions(window);
  applyNavigationRestrictions(window);
  void window.loadFile(rendererPath);
  window.on("closed", () => {
    if (mainWindow === window) mainWindow = null;
  });
  return window;
}

function registerTransport(): void {
  ipcMain.handle(DESCRIBE_CHANNEL, async (event, rawCommand: unknown) =>
    transport.execute(rawCommand, senderIsAuthorized(event)),
  );
}

interface SmokeState {
  completed: boolean;
  response: unknown;
  error: string | null;
}

async function runArchitectureSmoke(window: BrowserWindow): Promise<void> {
  if (window.webContents.isLoading()) {
    await new Promise<void>((resolve) => {
      window.webContents.once("did-finish-load", () => resolve());
    });
  }
  const bridgeKeys = await window.webContents.executeJavaScript(
    "Object.keys(window.offlineArchive).sort()",
    true,
  );
  const rendererBoundary = await window.webContents.executeJavaScript(
    "({ requireType: typeof require, processType: typeof process, ipcRendererType: typeof window.ipcRenderer })",
    true,
  );
  const errorResponse = parseResponseEnvelope(
    await window.webContents.executeJavaScript(
      `window.offlineArchive.systemDescribe({
        contractVersion: "2.0.0",
        commandId: "smoke-invalid-command",
        commandType: "system.describe",
        correlationId: "smoke-invalid-correlation",
        timestamp: "2026-07-31T12:00:00.000Z",
        payload: {}
      })`,
      true,
    ),
  );
  await window.webContents.executeJavaScript(
    "document.querySelector('#describe-button').click(); true",
    true,
  );
  const deadline = Date.now() + 15_000;
  let state: SmokeState = { completed: false, response: null, error: null };
  while (!state.completed && Date.now() < deadline) {
    state = await window.webContents.executeJavaScript(
      "window.__architectureSmoke",
      true,
    );
    if (!state.completed) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  const passed =
    state.completed &&
    state.error === null &&
    errorResponse.status === "error" &&
    errorResponse.error.code === "CONTRACT_UNSUPPORTED_VERSION";
  const report = {
    status: passed ? "passed" : "failed",
    bridgeKeys,
    errorResponse,
    response: state.response,
    rendererBoundary,
    security: MAIN_WINDOW_SECURITY,
    restrictions: {
      senderValidation: true,
      navigation: true,
      windowCreation: true,
      permissions: true,
      downloads: true,
      webviews: true,
      remoteContent: false,
    },
  };
  process.stdout.write(`ARCHITECTURE_SMOKE=${JSON.stringify(report)}\n`);
  app.exit(passed ? 0 : 1);
}

app.whenReady().then(() => {
  registerTransport();
  mainWindow = createMainWindow();
  if (architectureSmoke) {
    void runArchitectureSmoke(mainWindow).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown smoke failure";
      process.stderr.write(`Architecture smoke failed: ${message}\n`);
      app.exit(1);
    });
  }
});

app.on("window-all-closed", () => app.quit());
