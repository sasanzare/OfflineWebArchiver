import {
  createSystemDescribeCommand,
  type SystemDescribeCommand,
} from "@offline-web-archive/contracts";
import type { LogEvent, Logger } from "@offline-web-archive/observability";

export function fixedClock(
  value = "2026-07-31T12:00:00.000Z",
): () => string {
  return () => value;
}

export function systemDescribeFixture(): SystemDescribeCommand {
  return createSystemDescribeCommand({
    commandId: "command-test-001",
    correlationId: "correlation-test-001",
    timestamp: "2026-07-31T12:00:00.000Z",
  });
}

export interface InMemoryLogger extends Logger {
  readonly events: readonly LogEvent[];
}

export function createInMemoryLogger(): InMemoryLogger {
  const events: LogEvent[] = [];
  return {
    events,
    log(event): void {
      events.push(event);
    },
  };
}
