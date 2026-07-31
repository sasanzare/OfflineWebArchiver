import { contextBridge, ipcRenderer } from "electron";
import type {
  PreloadApi,
  PublicRunResult,
  SpikeProgress,
  StructuredFailure,
} from "../shared/contracts.js";

// Sandboxed Electron preloads have a restricted CommonJS loader. Keep the
// runtime bridge self-contained; the main-process constants are covered by the
// Electron smoke test's exact bridge and stage assertions.
const IPC_CHANNELS = Object.freeze({
  run: "phase02:run",
  progress: "phase02:progress",
  openOutput: "phase02:open-output",
  reopenPreview: "phase02:reopen-preview",
  runtimeInfo: "phase02:runtime-info",
});

type RunResponse =
  | { ok: true; result: PublicRunResult }
  | { ok: false; failure: StructuredFailure };

const api: PreloadApi = {
  async run() {
    const response = await ipcRenderer.invoke(IPC_CHANNELS.run) as RunResponse;
    if (!response.ok) {
      throw new Error(`${response.failure.category}: ${response.failure.message}`);
    }
    return response.result;
  },
  openOutput: () => ipcRenderer.invoke(IPC_CHANNELS.openOutput) as Promise<boolean>,
  reopenPreview: () =>
    ipcRenderer.invoke(IPC_CHANNELS.reopenPreview) as Promise<boolean>,
  getRuntimeInfo: () =>
    ipcRenderer.invoke(IPC_CHANNELS.runtimeInfo) as Promise<{
      experimental: true;
      packaged: boolean;
    }>,
  onProgress(listener) {
    if (typeof listener !== "function") {
      throw new TypeError("Progress listener must be a function.");
    }
    const wrapped = (_event: Electron.IpcRendererEvent, value: SpikeProgress) => {
      listener(value);
    };
    ipcRenderer.on(IPC_CHANNELS.progress, wrapped);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.progress, wrapped);
  },
};

contextBridge.exposeInMainWorld("phase02Spike", Object.freeze(api));
