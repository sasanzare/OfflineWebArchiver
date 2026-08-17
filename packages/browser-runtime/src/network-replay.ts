import {
  canonicalReplayRequestIdentity,
  classifyCaptureEligibility,
  classifyReplayExternalDependency,
  classifyReplayMiss,
  containsSensitiveReplayBody,
  isReplayableResponseStatus,
  isRuntimeLocalRequest,
  safeReplayUrl,
  validateRuntimeOrigin,
  type NetworkReplayPolicy,
  type ReplayLookupResult,
  type ReplayRequestIdentityInput,
  type ReplayRuntimeEvent,
} from "@offline-web-archive/archive-core";
import type { Request, Response, Route } from "playwright-core";

export type PlaywrightReplayRouteOutcome = "fulfilled" | "continued" | "aborted";

export type PlaywrightReplayCdpOutcome = "fulfilled" | "aborted" | "defer";

export interface PlaywrightReplayCdpSession {
  send(command: string, parameters: Readonly<Record<string, unknown>>): Promise<unknown>;
}

export interface PlaywrightReplayCdpRequest {
  readonly session: PlaywrightReplayCdpSession;
  readonly requestId: string;
  readonly method: string;
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly resourceType: string;
}

function pageUrl(request: Request): string | null {
  try { return safeReplayUrl(request.frame().url()); }
  catch { return null; }
}

function eventValues(policy: NetworkReplayPolicy, method: string, url: string, headers: Readonly<Record<string, string>>, resourceType: string, initiatingPage: string | null, reason: string, matchState: string, eventType: ReplayRuntimeEvent["eventType"]): ReplayRuntimeEvent {
  let normalizedIdentity: string | null = null;
  if (method === "GET" || method === "HEAD") {
    try {
      normalizedIdentity = canonicalReplayRequestIdentity({
        projectId: policy.projectId,
        runId: policy.runId,
        projectRevisionId: policy.projectRevisionId,
        method,
        url,
        headers,
      }).key;
    } catch { /* Sensitive or malformed requests remain observable only by safe URL. */ }
  }
  return {
    eventType,
    projectId: policy.projectId,
    runId: policy.runId,
    projectRevisionId: policy.projectRevisionId,
    method: method.slice(0, 16),
    safeUrl: safeReplayUrl(url),
    normalizedIdentity,
    resourceType: resourceType.slice(0, 80),
    initiatingPage,
    reason: reason.slice(0, 160),
    matchState: matchState.slice(0, 80),
    strictOffline: policy.strictOffline,
    occurredAt: new Date().toISOString(),
  };
}

function eventBase(policy: NetworkReplayPolicy, request: Request, reason: string, matchState: string, eventType: ReplayRuntimeEvent["eventType"]): ReplayRuntimeEvent {
  return eventValues(policy, request.method(), request.url(), request.headers(), request.resourceType(), pageUrl(request), reason, matchState, eventType);
}

function replayMissReason(policy: NetworkReplayPolicy, url: string, fallback: string): string {
  const classification = classifyReplayExternalDependency(url, policy.externalDependencyMap);
  return classification === null ? fallback : `external-dependency:${classification}`;
}

export class PlaywrightNetworkReplayAdapter {
  public constructor(private readonly policy: NetworkReplayPolicy) {
    if (policy.version !== 1) throw new Error("Unsupported Network Replay policy version");
    if (validateRuntimeOrigin(policy.runtimeOrigin) !== policy.runtimeOrigin) throw new Error("Network Replay requires the exact assigned loopback runtime origin");
    if (policy.externalDependencyMap?.dependencies.some((dependency) => dependency.projectId !== policy.projectId || dependency.runId !== policy.runId || dependency.projectRevisionId !== policy.projectRevisionId)) throw new Error("Network Replay dependency map scope does not match the active Project/Run/Revision");
  }

  private async emit(event: ReplayRuntimeEvent): Promise<void> {
    await Promise.resolve(this.policy.onEvent?.(event)).catch(() => undefined);
  }

  public async handleCdpRequest(input: PlaywrightReplayCdpRequest): Promise<PlaywrightReplayCdpOutcome> {
    if (input.method !== "GET" && input.method !== "HEAD") {
      await this.emit(eventValues(this.policy, input.method, input.url, input.headers, input.resourceType, null, "METHOD_NOT_SUPPORTED", "blocked", "mutation-blocked"));
      await input.session.send("Fetch.failRequest", { requestId: input.requestId, errorReason: "BlockedByClient" }).catch(() => undefined);
      return "aborted";
    }
    if (isRuntimeLocalRequest(input.url, this.policy.runtimeOrigin)) {
      await this.emit(eventValues(this.policy, input.method, input.url, input.headers, input.resourceType, null, "RUNTIME_LOCAL_ORIGIN", "local", "runtime-local-allow"));
      return "defer";
    }
    const replayMethod: "GET" | "HEAD" = input.method === "HEAD" ? "HEAD" : "GET";
    const identityInput: ReplayRequestIdentityInput = {
      projectId: this.policy.projectId,
      runId: this.policy.runId,
      projectRevisionId: this.policy.projectRevisionId,
      method: replayMethod,
      url: input.url,
      headers: input.headers,
    };
    try { canonicalReplayRequestIdentity(identityInput); }
    catch (error) {
      const reason = error instanceof Error && /sensitive/i.test(error.message) ? "sensitive-request" : "unsupported-protocol";
      await this.emit(eventValues(this.policy, input.method, input.url, input.headers, input.resourceType, null, reason, "invalid", "external-network-leakage"));
      await input.session.send("Fetch.failRequest", { requestId: input.requestId, errorReason: "BlockedByClient" }).catch(() => undefined);
      return "aborted";
    }
    let lookup: ReplayLookupResult;
    try { lookup = await this.policy.lookup.lookup(identityInput); }
    catch { lookup = { state: "miss", reason: "integrity-failure" }; }
    if (lookup.state === "match") {
      const snapshot = lookup.snapshot;
      try {
        if (!isReplayableResponseStatus(snapshot.status)) throw new Error("invalid-status");
        const body = await this.policy.lookup.readBody(snapshot);
        if (snapshot.status >= 300 && snapshot.status < 400 && snapshot.responseHeaders["location"] === undefined) throw new Error("unsafe-redirect");
        await input.session.send("Fetch.fulfillRequest", {
          requestId: input.requestId,
          responseCode: snapshot.status,
          responseHeaders: Object.entries(snapshot.responseHeaders).map(([name, value]) => ({ name, value })),
          body: input.method === "HEAD" ? "" : Buffer.from(body).toString("base64"),
        });
        await this.emit(eventValues(this.policy, input.method, input.url, input.headers, input.resourceType, null, "REPLAY_MATCH", "match", "replay-match"));
        return "fulfilled";
      } catch {
        await this.emit(eventValues(this.policy, input.method, input.url, input.headers, input.resourceType, null, "integrity-failure", "integrity-failure", "external-network-leakage"));
        await input.session.send("Fetch.failRequest", { requestId: input.requestId, errorReason: "BlockedByClient" }).catch(() => undefined);
        return "aborted";
      }
    }
    const reason = lookup.state === "ambiguous" ? "ambiguous-match" : lookup.state === "integrity-failure" ? "integrity-failure" : replayMissReason(this.policy, input.url, classifyReplayMiss(lookup));
    await this.emit(eventValues(this.policy, input.method, input.url, input.headers, input.resourceType, null, reason, lookup.state, "external-network-leakage"));
    if (this.policy.strictOffline) {
      await input.session.send("Fetch.failRequest", { requestId: input.requestId, errorReason: "BlockedByClient" }).catch(() => undefined);
      return "aborted";
    }
    return "defer";
  }

  public async handleRoute(route: Route): Promise<PlaywrightReplayRouteOutcome> {
    const request = route.request();
    const method = request.method();
    if (method !== "GET" && method !== "HEAD") {
      await this.emit(eventBase(this.policy, request, "METHOD_NOT_SUPPORTED", "blocked", "mutation-blocked"));
      await route.abort("blockedbyclient").catch(() => undefined);
      return "aborted";
    }
    if (isRuntimeLocalRequest(request.url(), this.policy.runtimeOrigin)) {
      await this.emit(eventBase(this.policy, request, "RUNTIME_LOCAL_ORIGIN", "local", "runtime-local-allow"));
      await route.continue().catch(() => undefined);
      return "continued";
    }
    const replayMethod: "GET" | "HEAD" = method === "HEAD" ? "HEAD" : "GET";
    const identityInput: ReplayRequestIdentityInput = {
      projectId: this.policy.projectId,
      runId: this.policy.runId,
      projectRevisionId: this.policy.projectRevisionId,
      method: replayMethod,
      url: request.url(),
      headers: request.headers(),
    };
    let identity;
    try {
      identity = canonicalReplayRequestIdentity(identityInput);
    } catch (error) {
      const reason = error instanceof Error && /sensitive/i.test(error.message) ? "sensitive-request" : "unsupported-protocol";
      await this.emit(eventBase(this.policy, request, reason, "invalid", "external-network-leakage"));
      await route.abort("blockedbyclient").catch(() => undefined);
      return "aborted";
    }
    let lookup: ReplayLookupResult;
    try { lookup = await this.policy.lookup.lookup(identityInput); }
    catch { lookup = { state: "miss", reason: "integrity-failure" }; }
    if (lookup.state === "match") {
      const snapshot = lookup.snapshot;
      try {
        if (!isReplayableResponseStatus(snapshot.status)) throw new Error("invalid-status");
        const body = await this.policy.lookup.readBody(snapshot);
        const headers = snapshot.responseHeaders;
        if (snapshot.status >= 300 && snapshot.status < 400 && headers["location"] === undefined) throw new Error("unsafe-redirect");
        await route.fulfill({
          status: snapshot.status,
          headers,
          body: method === "HEAD" ? Buffer.alloc(0) : Buffer.from(body),
        });
        await this.emit(eventBase(this.policy, request, "REPLAY_MATCH", "match", "replay-match"));
        return "fulfilled";
      } catch {
        await this.emit(eventBase(this.policy, request, "integrity-failure", "integrity-failure", "external-network-leakage"));
        await route.abort("blockedbyclient").catch(() => undefined);
        return "aborted";
      }
    }
    const reason = lookup.state === "ambiguous" ? "ambiguous-match" : lookup.state === "integrity-failure" ? "integrity-failure" : replayMissReason(this.policy, request.url(), classifyReplayMiss(lookup));
    await this.emit(eventBase(this.policy, request, reason, lookup.state, "external-network-leakage"));
    if (this.policy.strictOffline) {
      await route.abort("blockedbyclient").catch(() => undefined);
      return "aborted";
    }
    await route.continue().catch(() => undefined);
    return "continued";
  }

  public async captureResponse(response: Response): Promise<void> {
    const capture = this.policy.capture;
    if (capture === undefined) return;
    const request = response.request();
    const headers = response.headers();
    const contentType = headers["content-type"] ?? "";
    const eligibility = classifyCaptureEligibility({
      policy: capture.policy,
      method: request.method(),
      url: request.url(),
      resourceType: request.resourceType(),
      contentType,
      requestHeaders: request.headers(),
      responseHeaders: headers,
    });
    if (eligibility.eligibility !== "capturable") return;
    let body: Buffer;
    try { body = await response.body(); }
    catch { return; }
    if (body.byteLength > capture.policy.maximumResponseBytes || body.byteLength > 8 * 1024 * 1024) return;
    if (capture.policy.rejectSensitiveResponseBodies && containsSensitiveReplayBody(body, contentType)) return;
    const captureInput = {
      projectId: this.policy.projectId,
      runId: this.policy.runId,
      projectRevisionId: this.policy.projectRevisionId,
      originalUrl: request.url(),
      request: { method: request.method(), url: request.url(), headers: request.headers() },
      response: { status: response.status(), headers, contentType },
      body: new Uint8Array(body),
      capturedAt: capture.capturedAt?.() ?? new Date().toISOString(),
      pageId: capture.pageId ?? null,
      workerId: capture.workerId ?? null,
      ...(capture.queryPolicy === undefined ? {} : { queryPolicy: capture.queryPolicy }),
    };
    await capture.sink.capture(captureInput).catch(() => undefined);
  }
}

export function createPlaywrightNetworkReplayAdapter(policy: NetworkReplayPolicy): PlaywrightNetworkReplayAdapter {
  return new PlaywrightNetworkReplayAdapter(policy);
}
