import type { CommandEnvelope, ResponseEnvelope } from "@offline-web-archive/contracts";
import type { SelectionPurpose } from "../shared/bridge-contract.js";

declare global {
  interface Window {
    offlineArchive: {
      execute(command: CommandEnvelope): Promise<ResponseEnvelope>;
      selectPath(purpose: SelectionPurpose): Promise<string | null>;
    };
  }
}

export {};
