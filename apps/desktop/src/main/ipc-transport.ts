import type { ApplicationService } from "@offline-web-archive/application-service";
import { parseResponseEnvelope, type ResponseEnvelope } from "@offline-web-archive/contracts";

export interface DesktopTransportHandler {
  execute(rawCommand: unknown, senderAuthorized: boolean): Promise<ResponseEnvelope>;
}

export function createDesktopTransportHandler(
  service: ApplicationService,
): DesktopTransportHandler {
  return Object.freeze({
    async execute(
      rawCommand: unknown,
      senderAuthorized: boolean,
    ): Promise<ResponseEnvelope> {
      return parseResponseEnvelope(
        await service.execute(rawCommand, {
          transport: "electron-ipc",
          authorized: senderAuthorized,
        }),
      );
    },
  });
}

