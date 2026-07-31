import type {
  ResponseEnvelope,
  SystemDescribeCommand,
} from "@offline-web-archive/contracts";

declare global {
  interface Window {
    offlineArchive: {
      systemDescribe(command: SystemDescribeCommand): Promise<ResponseEnvelope>;
    };
    __architectureSmoke: {
      completed: boolean;
      response: ResponseEnvelope | null;
      error: string | null;
    };
  }
}

export {};

