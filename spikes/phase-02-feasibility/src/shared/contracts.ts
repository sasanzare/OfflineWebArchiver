export const SPIKE_STAGES = [
  "Preparing fixture",
  "Starting Chromium",
  "Loading SPA",
  "Waiting for rendered state",
  "Extracting HTML",
  "Saving archive",
  "Starting offline server",
  "Opening offline preview",
  "Completed",
] as const;

export type SpikeStage = (typeof SPIKE_STAGES)[number];

export type SpikeErrorCategory =
  | "SPIKE_CONFIGURATION_ERROR"
  | "SPIKE_FIXTURE_START_ERROR"
  | "SPIKE_BROWSER_NOT_FOUND"
  | "SPIKE_BROWSER_LAUNCH_ERROR"
  | "SPIKE_NAVIGATION_ERROR"
  | "SPIKE_RENDER_TIMEOUT"
  | "SPIKE_HTML_EXTRACTION_ERROR"
  | "SPIKE_ARCHIVE_WRITE_ERROR"
  | "SPIKE_RUNTIME_SERVER_ERROR"
  | "SPIKE_OFFLINE_VALIDATION_ERROR"
  | "SPIKE_PACKAGING_ERROR"
  | "SPIKE_INTERNAL_ERROR";

export interface SpikeProgress {
  runId: string;
  stage: SpikeStage;
  timestamp: string;
  message: string;
}

export interface PublicRunResult {
  runId: string;
  status: "passed";
  archiveUrl: string;
  outputLocation: string;
  chromiumVersion: string;
  renderDurationMs: number;
  totalDurationMs: number;
  consoleErrorCount: number;
  failedRequestCount: number;
  originalFixtureUnavailable: boolean;
  offlineContentVisible: boolean;
}

export interface StructuredFailure {
  category: SpikeErrorCategory;
  message: string;
  recoverable: boolean;
}

export interface PreloadApi {
  run(): Promise<PublicRunResult>;
  openOutput(): Promise<boolean>;
  reopenPreview(): Promise<boolean>;
  getRuntimeInfo(): Promise<{ experimental: true; packaged: boolean }>;
  onProgress(listener: (progress: SpikeProgress) => void): () => void;
}
