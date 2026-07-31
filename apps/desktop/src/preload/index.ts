import { contextBridge, ipcRenderer } from "electron";
import type { CommandEnvelope, ResponseEnvelope } from "@offline-web-archive/contracts";
import type { SelectionPurpose } from "../shared/bridge-contract.js";

const EXECUTE_CHANNEL = "offline-archive:execute";
const SELECT_PATH_CHANNEL = "offline-archive:select-path";

export interface DesktopBridge {
  execute(command: CommandEnvelope): Promise<ResponseEnvelope>;
  selectPath(purpose: SelectionPurpose): Promise<string | null>;
}

const bridge: DesktopBridge = Object.freeze({
  execute(command: CommandEnvelope) {
    return ipcRenderer.invoke(EXECUTE_CHANNEL, command) as Promise<ResponseEnvelope>;
  },
  selectPath(purpose: SelectionPurpose) {
    return ipcRenderer.invoke(SELECT_PATH_CHANNEL, purpose) as Promise<string | null>;
  },
});

contextBridge.exposeInMainWorld("offlineArchive", bridge);
