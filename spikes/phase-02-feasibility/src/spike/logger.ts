import type { SpikeErrorCategory, SpikeStage } from "../shared/contracts.js";
import { writeTextAtomic } from "./archive.js";
import { sanitizeErrorMessage } from "./errors.js";

export interface LogEvent {
  timestamp: string;
  runId: string;
  stage: SpikeStage;
  level: "info" | "error";
  category: SpikeErrorCategory | "SPIKE_EVENT";
  message: string;
}

export class StructuredLogger {
  readonly #events: LogEvent[] = [];

  public constructor(private readonly runId: string) {}

  public info(stage: SpikeStage, message: string): void {
    this.#events.push({
      timestamp: new Date().toISOString(),
      runId: this.runId,
      stage,
      level: "info",
      category: "SPIKE_EVENT",
      message: sanitizeErrorMessage(message),
    });
  }

  public error(
    stage: SpikeStage,
    category: SpikeErrorCategory,
    message: unknown,
  ): void {
    this.#events.push({
      timestamp: new Date().toISOString(),
      runId: this.runId,
      stage,
      level: "error",
      category,
      message: sanitizeErrorMessage(message),
    });
  }

  public events(): readonly LogEvent[] {
    return this.#events;
  }

  public async flush(filePath: string): Promise<void> {
    const lines = this.#events.map((entry) => JSON.stringify(entry)).join("\n");
    await writeTextAtomic(filePath, `${lines}\n`);
  }
}

