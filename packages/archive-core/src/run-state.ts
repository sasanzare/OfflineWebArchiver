export const CRAWL_RUN_STATE_VERSION = 1 as const;

export const CRAWL_RUN_STATES = [
  "running",
  "pausing",
  "paused",
  "waiting_for_network",
  "waiting_for_auth",
  "waiting_for_rate_limit",
  "cancelling",
  "cancelled",
  "completed",
  "failed",
] as const;

export type CrawlRunState = (typeof CRAWL_RUN_STATES)[number];

const transitions: Readonly<Record<CrawlRunState, readonly CrawlRunState[]>> = Object.freeze({
  running: ["pausing", "paused", "waiting_for_network", "waiting_for_auth", "waiting_for_rate_limit", "cancelling", "completed", "failed"],
  pausing: ["paused", "running", "cancelling", "failed"],
  paused: ["running", "cancelling", "cancelled", "failed"],
  waiting_for_network: ["running", "cancelling", "failed"],
  waiting_for_auth: ["running", "cancelling", "failed"],
  waiting_for_rate_limit: ["running", "cancelling", "failed"],
  cancelling: ["cancelled", "failed"],
  cancelled: [],
  completed: [],
  failed: [],
});

export function isCrawlRunState(value: unknown): value is CrawlRunState {
  return typeof value === "string" && (CRAWL_RUN_STATES as readonly string[]).includes(value);
}

export function canTransitionCrawlRunState(from: CrawlRunState, to: CrawlRunState): boolean {
  return from === to || transitions[from].includes(to);
}

export function assertCrawlRunTransition(from: CrawlRunState, to: CrawlRunState): void {
  if (!canTransitionCrawlRunState(from, to)) {
    throw new Error(`Crawl Run state transition ${from} -> ${to} is not permitted`);
  }
}
