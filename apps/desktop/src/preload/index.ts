import { contextBridge, ipcRenderer } from "electron";
import type {
  ResponseEnvelope,
  SystemDescribeCommand,
} from "@offline-web-archive/contracts";

const DESCRIBE_CHANNEL = "offline-archive:system-describe";

export interface DesktopBridge {
  systemDescribe(command: SystemDescribeCommand): Promise<ResponseEnvelope>;
}

const bridge: DesktopBridge = Object.freeze({
  systemDescribe(command: SystemDescribeCommand) {
    return ipcRenderer.invoke(DESCRIBE_CHANNEL, command) as Promise<ResponseEnvelope>;
  },
});

contextBridge.exposeInMainWorld("offlineArchive", bridge);
