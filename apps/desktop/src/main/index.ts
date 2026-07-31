import path from "node:path";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { app, BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from "electron";
import { createApplicationService } from "@offline-web-archive/application-service";
import { createProjectCommand, parseResponseEnvelope } from "@offline-web-archive/contracts";
import { createDevelopmentLogger } from "@offline-web-archive/observability";
import { readEnvironmentConfiguration, readRuntimePlatformInfo } from "@offline-web-archive/platform";
import { createDesktopTransportHandler } from "./ipc-transport.js";
import { isSelectionPurpose, type SelectionPurpose } from "../shared/bridge-contract.js";

export const EXECUTE_CHANNEL = "offline-archive:execute";
export const SELECT_PATH_CHANNEL = "offline-archive:select-path";
export const MAIN_WINDOW_SECURITY = Object.freeze({
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  webSecurity: true,
});

const architectureSmoke = process.argv.includes("--architecture-smoke");
const smokeRootArgument = process.argv.find((argument) => argument.startsWith("--project-smoke-root="));
const smokeRoot = smokeRootArgument?.slice("--project-smoke-root=".length) ?? null;
let mainWindow: BrowserWindow | null = null;
let expectedRendererUrl = "";
let shutdownStarted = false;
const approvedPaths = new Set<string>();

app.enableSandbox();

const configuration = readEnvironmentConfiguration(process.env);
const service = createApplicationService({
  configuration,
  ...readRuntimePlatformInfo(),
  logger: createDevelopmentLogger((line) => process.stderr.write(`${line}\n`)),
});
const transport = createDesktopTransportHandler(service);

function senderIsAuthorized(event: IpcMainInvokeEvent): boolean {
  const window = mainWindow;
  return window !== null && !window.isDestroyed() && event.sender.id === window.webContents.id &&
    event.senderFrame === window.webContents.mainFrame && event.senderFrame.url === expectedRendererUrl;
}

function applySessionRestrictions(window: BrowserWindow): void {
  const targetSession = window.webContents.session;
  targetSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
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
    width: 1040,
    height: 800,
    show: !architectureSmoke,
    title: "Offline Web Archive Builder",
    webPreferences: { preload: preloadPath, ...MAIN_WINDOW_SECURITY },
  });
  applySessionRestrictions(window);
  applyNavigationRestrictions(window);
  void window.loadFile(rendererPath);
  window.on("closed", () => {
    if (mainWindow === window) mainWindow = null;
  });
  return window;
}

function commandUsesOnlyApprovedPaths(rawCommand: unknown): boolean {
  if (typeof rawCommand !== "object" || rawCommand === null) return false;
  const record = rawCommand as Record<string, unknown>;
  if (record["commandType"] === "system.describe" || record["commandType"] === "project.close") return true;
  const payload = record["payload"];
  if (typeof payload !== "object" || payload === null) return false;
  const values = Object.entries(payload as Record<string, unknown>)
    .filter(([key]) => key.endsWith("Path"))
    .map(([, value]) => value);
  return values.every((value) => typeof value === "string" && approvedPaths.has(path.resolve(value)));
}

async function selectPath(purpose: SelectionPurpose): Promise<string | null> {
  const window = mainWindow;
  if (window === null) return null;
  if (purpose === "project-open") {
    const result = await dialog.showOpenDialog(window, { title: "Open Project", properties: ["openDirectory"] });
    return result.canceled ? null : result.filePaths[0] ?? null;
  }
  if (purpose === "archive-open") {
    const result = await dialog.showOpenDialog(window, { title: "Import Project", properties: ["openFile"], filters: [{ name: "Project ZIP", extensions: ["zip"] }] });
    return result.canceled ? null : result.filePaths[0] ?? null;
  }
  const result = await dialog.showSaveDialog(window, {
    title: purpose === "archive-save" ? "Export Project" : purpose === "project-create" ? "Create Project" : "Import Project To",
    ...(purpose === "archive-save" ? { filters: [{ name: "Project ZIP", extensions: ["zip"] }] } : {}),
  });
  return result.canceled ? null : result.filePath ?? null;
}

function registerTransport(): void {
  ipcMain.handle(EXECUTE_CHANNEL, async (event, rawCommand: unknown) => {
    const authorized = senderIsAuthorized(event) && commandUsesOnlyApprovedPaths(rawCommand);
    return transport.execute(rawCommand, authorized);
  });
  ipcMain.handle(SELECT_PATH_CHANNEL, async (event, purpose: unknown) => {
    if (!senderIsAuthorized(event) || !isSelectionPurpose(purpose)) return null;
    const selected = await selectPath(purpose);
    if (selected !== null) approvedPaths.add(path.resolve(selected));
    return selected;
  });
}

interface SmokeResponse {
  status: string;
  result?: { resultType?: string; project?: { projectId?: string }; report?: { valid?: boolean }; import?: { project?: { projectId?: string } } };
  error?: { code?: string };
}

async function runArchitectureSmoke(window: BrowserWindow): Promise<void> {
  if (smokeRoot === null) throw new Error("The Project smoke root argument is required");
  if (window.webContents.isLoading()) {
    await new Promise<void>((resolve) => window.webContents.once("did-finish-load", () => resolve()));
  }
  const projectPath = path.join(smokeRoot, "desktop-project");
  const archivePath = path.join(smokeRoot, "desktop-project.zip");
  const importedPath = path.join(smokeRoot, "desktop-imported");
  [projectPath, archivePath, importedPath].forEach((value) => approvedPaths.add(path.resolve(value)));
  const invoke = async (commandType: string, payload: Record<string, unknown>): Promise<SmokeResponse> =>
    window.webContents.executeJavaScript(`window.offlineArchive.execute(${JSON.stringify({
      contractVersion: "1.1.0",
      commandId: `smoke-${randomUUID()}`,
      commandType,
      correlationId: `smoke-${randomUUID()}`,
      timestamp: new Date().toISOString(),
      payload,
    })})`, true) as Promise<SmokeResponse>;
  const bridgeKeys = await window.webContents.executeJavaScript("Object.keys(window.offlineArchive).sort()", true);
  const rendererBoundary = await window.webContents.executeJavaScript("({ requireType: typeof require, processType: typeof process, ipcRendererType: typeof window.ipcRenderer })", true);
  const invalidVersion = await window.webContents.executeJavaScript(`window.offlineArchive.execute(${JSON.stringify({
    contractVersion: "2.0.0",
    commandId: "smoke-invalid-command",
    commandType: "system.describe",
    correlationId: "smoke-invalid-correlation",
    timestamp: "2026-07-31T12:00:00.000Z",
    payload: {},
  })})`, true) as SmokeResponse;
  const created = await invoke("project.create", { destinationPath: projectPath, name: "Desktop Smoke", slug: "desktop-smoke" });
  const validated = await invoke("project.validate", { projectPath });
  const opened = await invoke("project.open", { projectPath });
  const info = await invoke("project.info", { projectPath });
  const exported = await invoke("project.export", { projectPath, archivePath });
  const closed = await invoke("project.close", {});
  const imported = await invoke("project.import", { archivePath, destinationPath: importedPath });
  const importedValidation = await invoke("project.validate", { projectPath: importedPath });
  const projectId = created.result?.project?.projectId;
  const passed = [created, validated, opened, info, exported, closed, imported, importedValidation]
    .every((response) => response.status === "success") &&
    validated.result?.report?.valid === true && importedValidation.result?.report?.valid === true &&
    imported.result?.import?.project?.projectId === projectId &&
    invalidVersion.status === "error" && invalidVersion.error?.code === "CONTRACT_UNSUPPORTED_VERSION";
  const report = {
    status: passed ? "passed" : "failed",
    bridgeKeys,
    rendererBoundary,
    invalidVersion,
    operations: { created, validated, opened, info, exported, closed, imported, importedValidation },
    security: MAIN_WINDOW_SECURITY,
    restrictions: { senderValidation: true, approvedPathGrants: true, navigation: true, windowCreation: true, permissions: true, downloads: true, webviews: true, remoteContent: false },
  };
  process.stdout.write(`ARCHITECTURE_SMOKE=${JSON.stringify(report)}\n`);
  app.exit(passed ? 0 : 1);
}

function closeCommand() {
  return createProjectCommand("project.close", {}, {
    commandId: `shutdown-${randomUUID()}`,
    correlationId: `shutdown-${randomUUID()}`,
    timestamp: new Date().toISOString(),
  });
}

app.whenReady().then(() => {
  registerTransport();
  mainWindow = createMainWindow();
  if (architectureSmoke) {
    void runArchitectureSmoke(mainWindow).catch((error: unknown) => {
      process.stderr.write(`Architecture smoke failed: ${error instanceof Error ? error.message : "Unknown smoke failure"}\n`);
      app.exit(1);
    });
  }
});

app.on("before-quit", (event) => {
  if (architectureSmoke || shutdownStarted) return;
  event.preventDefault();
  shutdownStarted = true;
  void service.execute(closeCommand(), { transport: "electron-ipc", authorized: true }).finally(() => app.quit());
});

app.on("window-all-closed", () => app.quit());
