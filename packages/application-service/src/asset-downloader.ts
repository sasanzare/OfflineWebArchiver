import { createHash } from "node:crypto";
import {
  AssetOperationError,
  canonicalAssetContentPath,
  canonicalAssetPartialPath,
  type AssetNetworkPort,
  type AssetFileHandlePort,
  type AssetFileStorePort,
  type AssetRepositoryPort,
  type AssetSource,
  type AssetSourceInput,
  type RecoveryRepositoryPort,
  type WorkerExecutionInput,
  type WorkerReservation,
  decideAssetResume,
  parseAssetContentRange,
  normalizeAssetContentType,
  normalizeAssetValidator,
  safeAssetUrl,
} from "@offline-web-archive/archive-core";

const DEFAULT_MAXIMUM_BYTES = 512 * 1024 * 1024;
const DEFAULT_CHECKPOINT_BYTES = 1024 * 1024;
const MAX_REDIRECTS = 20;

export interface AssetUrlAuthorization {
  readonly allowed: boolean;
  readonly reasonCode?: string;
}

export type AssetAuthorizeUrl = (url: string) => Promise<AssetUrlAuthorization>;

export interface AssetDownloadInput {
  readonly projectRoot: string;
  readonly asset: AssetSourceInput;
  readonly storage: AssetRepositoryPort;
  readonly fileStore: AssetFileStorePort;
  readonly network: AssetNetworkPort;
  readonly lease: {
    readonly projectId: string;
    readonly runId: string;
    readonly jobId: string;
    readonly leaseToken: string;
    readonly fencingGeneration: number;
    readonly ownerId: string;
  };
  readonly reservation: WorkerReservation;
  readonly networkBudget: WorkerExecutionInput["networkBudget"];
  readonly observeResponse: WorkerExecutionInput["observeResponse"];
  readonly heartbeat: () => Promise<void>;
  readonly authorizeUrl: AssetAuthorizeUrl;
  readonly recovery?: RecoveryRepositoryPort;
  readonly signal?: AbortSignal;
  readonly maximumBytes?: number;
  readonly checkpointIntervalBytes?: number;
  readonly operationId: string;
  readonly now?: () => string;
}

export interface AssetDownloadResult {
  readonly source: AssetSource;
  readonly content: NonNullable<AssetSource["content"]>;
  readonly reused: boolean;
  readonly deduplicated: boolean;
  readonly finalUrl: string;
  readonly redirectChain: readonly string[];
  readonly byteLength: number;
}

interface ResponseHeaders {
  readonly status: number;
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: AsyncIterable<Uint8Array>;
}

function header(headers: Readonly<Record<string, string>>, name: string): string | null {
  const wanted = name.toLowerCase();
  const found = Object.entries(headers).find(([key]) => key.toLowerCase() === wanted);
  return found?.[1] ?? null;
}

function responseRetryAfter(headers: Readonly<Record<string, string>>): string | null {
  return header(headers, "retry-after");
}

function safeInteger(value: number, label: string, minimum = 0): number {
  if (!Number.isSafeInteger(value) || value < minimum) throw new AssetOperationError("ASSET_INPUT_INVALID", `${label} is invalid`);
  return value;
}

function asBytes(value: Uint8Array): Uint8Array {
  return value instanceof Uint8Array ? value : new Uint8Array(value);
}

async function drain(body: AsyncIterable<Uint8Array>): Promise<void> {
  for await (const _chunk of body) { /* release the response without retaining it */ }
}

async function hashFile(fileStore: AssetFileStorePort, projectRoot: string, relativePath: string, maximumBytes: number): Promise<{ readonly sha256: string; readonly byteLength: number }> {
  const stat = await fileStore.stat(projectRoot, relativePath);
  if (stat === null) throw new AssetOperationError("ASSET_NOT_FOUND", "The Asset file was not found", true);
  if (stat.byteLength > maximumBytes) throw new AssetOperationError("ASSET_MAXIMUM_SIZE_EXCEEDED", "The persisted Asset exceeds the configured maximum size");
  const hash = createHash("sha256");
  let byteLength = 0;
  for await (const chunk of fileStore.read(projectRoot, relativePath)) {
    const bytes = asBytes(chunk);
    byteLength += bytes.byteLength;
    if (byteLength > maximumBytes) throw new AssetOperationError("ASSET_MAXIMUM_SIZE_EXCEEDED", "The Asset exceeds the configured maximum size");
    hash.update(bytes);
  }
  return { sha256: hash.digest("hex"), byteLength };
}

async function removeProjectFile(fileStore: AssetFileStorePort, projectRoot: string, relativePath: string | null): Promise<void> {
  if (relativePath === null) return;
  await fileStore.remove(projectRoot, relativePath);
}

async function ensurePartialFile(fileStore: AssetFileStorePort, projectRoot: string, source: AssetSource, previous: AssetSource): Promise<{ readonly relativePath: string; readonly byteLength: number }> {
  const relativePath = source.partialRelativePath ?? canonicalAssetPartialPath(source.assetSourceId, source.fencingGeneration);
  const prepared = await fileStore.preparePartial({ projectRoot, relativePath, previousRelativePath: previous.partialRelativePath, previousResumeOffset: previous.resumeOffset });
  return { relativePath, byteLength: prepared.byteLength };
}

async function withContentLock<T>(fileStore: AssetFileStorePort, projectRoot: string, sha256: string, operationId: string, signal: AbortSignal | undefined, operation: () => Promise<T>): Promise<T> {
  const lock = await fileStore.acquireContentLock(projectRoot, sha256, operationId, signal);
  try {
    return await operation();
  } finally {
    await lock.release();
  }
}

async function writeChunk(handle: AssetFileHandlePort, bytes: Uint8Array, filePosition: number): Promise<number> {
  let bufferOffset = 0;
  while (bufferOffset < bytes.byteLength) {
    const written = await handle.write(bytes, bufferOffset, bytes.byteLength - bufferOffset, filePosition + bufferOffset);
    if (written <= 0) throw new AssetOperationError("ASSET_NETWORK_FAILED", "The Asset partial file did not accept bytes", true);
    bufferOffset += written;
  }
  return bufferOffset;
}

function assertProxyAffinity(reservation: WorkerReservation): void {
  const requestedProxy = reservation.job.session?.proxyId ?? reservation.job.proxyId ?? null;
  const selectedProxy = reservation.proxy?.id ?? null;
  if (requestedProxy !== selectedProxy) throw new AssetOperationError("ASSET_NETWORK_FAILED", "The Scheduler Proxy affinity was not preserved");
  if (reservation.job.session !== undefined && reservation.job.session.proxyId !== selectedProxy) throw new AssetOperationError("ASSET_NETWORK_FAILED", "The authenticated Session Proxy affinity was not preserved");
}

async function checkpoint(input: AssetDownloadInput, source: AssetSource, relativePath: string, bytesWritten: number, expectedBytes: number | null, validator: string | null, resumeOffset: number, committed: boolean, sha256: string | null): Promise<void> {
  if (input.recovery === undefined) return;
  await input.recovery.saveArtifactCheckpoint({
    projectId: input.lease.projectId,
    runId: input.lease.runId,
    jobId: input.lease.jobId,
    leaseToken: input.lease.leaseToken,
    fencingGeneration: input.lease.fencingGeneration,
    ownerId: input.lease.ownerId,
    artifactKey: `asset:${source.assetSourceId}`,
    artifactKind: "asset",
    relativePath,
    bytesWritten,
    expectedBytes,
    sha256,
    validator,
    resumeOffset,
    committed,
    operationId: `${input.operationId}:${source.assetSourceId}:${resumeOffset}:${committed ? "committed" : "progress"}`,
  });
}

async function downloadAssetInternal(input: AssetDownloadInput): Promise<AssetDownloadResult> {
  const signal = input.signal;
  const maximumBytes = safeInteger(input.maximumBytes ?? DEFAULT_MAXIMUM_BYTES, "The Asset maximum size", 1);
  const checkpointInterval = safeInteger(input.checkpointIntervalBytes ?? DEFAULT_CHECKPOINT_BYTES, "The Asset checkpoint interval", 1);
  const now = input.now ?? (() => new Date().toISOString());
  if (input.lease.projectId !== input.asset.projectId || input.lease.runId !== input.asset.runId || input.lease.jobId !== input.asset.pageJobId) {
    throw new AssetOperationError("ASSET_LEASE_INVALID", "The Asset descriptor and Lease do not belong to the same Page Job");
  }
  assertProxyAffinity(input.reservation);
  const initialOrigin = new URL(input.asset.identity.normalizedUrl).origin;
  if (input.reservation.origin !== initialOrigin) throw new AssetOperationError("ASSET_NETWORK_FAILED", "The Asset request origin does not match the Scheduler reservation");
  const before = await input.storage.ensureAssetSource(input.asset);
  if (before.state === "completed" && before.content !== null && before.storageRelativePath !== null) {
    const stored = await hashFile(input.fileStore, input.projectRoot, before.storageRelativePath, maximumBytes);
    if (stored.sha256 !== before.sha256 || stored.sha256 !== before.content.sha256 || stored.byteLength !== before.content.byteLength) throw new AssetOperationError("ASSET_CONTENT_CONFLICT", "The completed Asset does not match its persisted content hash");
    return { source: before, content: before.content, reused: true, deduplicated: false, finalUrl: before.redirectChain[0] ?? before.normalizedUrl, redirectChain: before.redirectChain, byteLength: stored.byteLength };
  }

  const claimed = await input.storage.beginAssetDownload({ ...input.lease, assetSourceId: before.assetSourceId });
  const preparedPartial = await ensurePartialFile(input.fileStore, input.projectRoot, claimed, before);
  const partialRelativePath = preparedPartial.relativePath;
  let localBytes = preparedPartial.byteLength;
  let durableOffset = claimed.resumeOffset;
  if (localBytes < durableOffset) {
    durableOffset = 0;
    localBytes = 0;
  }
  const previousValidator = claimed.validator;
  const resumeInitial = decideAssetResume({
    localBytes,
    durableBytes: durableOffset,
    expectedBytes: claimed.expectedBytes,
    rangeSupported: true,
    storedValidator: previousValidator,
    remoteValidator: previousValidator,
    storedSha256: claimed.sha256,
    actualSha256: null,
  });
  let offset = resumeInitial.decision === "resume" ? resumeInitial.resumeOffset : 0;
  if (resumeInitial.decision !== "resume" && localBytes !== 0) {
    const truncateHandle = await input.fileStore.openFile(input.projectRoot, partialRelativePath);
    await truncateHandle.truncate(0);
    await truncateHandle.close();
    localBytes = 0;
  }
  let expectedBytes = claimed.expectedBytes;
  let validator = claimed.validator;
  let etag = claimed.etag;
  let lastModified = claimed.lastModified;
  let contentType: string | null = null;
  let finalUrl = claimed.normalizedUrl;
  let redirectChain: string[] = [];
  let statusCode = 200;
  let restarted = false;
  let checkpointAt = offset;

  for (;;) {
    if (signal?.aborted) throw new AssetOperationError("ASSET_CANCELLED", "The Asset operation was cancelled");
    const authorization = await input.authorizeUrl(finalUrl);
    if (!authorization.allowed) throw new AssetOperationError("ASSET_SCOPE_BLOCKED", authorization.reasonCode ?? "The Asset URL is not authorized");
    const requestHeaders: Record<string, string> = {};
    if (offset > 0) {
      requestHeaders["Range"] = `bytes=${offset}-`;
      if (validator !== null) requestHeaders["If-Range"] = validator;
    }
    const origin = new URL(finalUrl).origin;
    const permit = await (signal === undefined ? input.networkBudget.acquire({ origin }) : input.networkBudget.acquire({ origin, signal }));
    let response: ResponseHeaders;
    try {
      response = await input.network.request({ url: finalUrl, headers: requestHeaders, signal: signal ?? new AbortController().signal, proxyId: input.reservation.proxy?.id ?? null, sessionId: input.reservation.job.session?.sessionId ?? null });
      input.observeResponse({ origin, status: response.status, retryAfter: responseRetryAfter(response.headers) });
    } catch (error) {
      permit.release();
      if (signal?.aborted) throw new AssetOperationError("ASSET_CANCELLED", "The Asset operation was cancelled");
      throw new AssetOperationError("ASSET_NETWORK_FAILED", error instanceof Error ? error.message : "The Asset request failed", true);
    }
    try {
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = header(response.headers, "location");
        await drain(response.body);
        if (location === null) throw new AssetOperationError("ASSET_REDIRECT_BLOCKED", "The Asset redirect did not provide a Location");
        if (redirectChain.length >= MAX_REDIRECTS) throw new AssetOperationError("ASSET_REDIRECT_LIMIT", "The Asset redirect chain exceeded its bounded limit");
        const nextUrl = safeAssetUrl(new URL(location, finalUrl).toString());
        const nextAuthorization = await input.authorizeUrl(nextUrl);
        if (!nextAuthorization.allowed) throw new AssetOperationError("ASSET_REDIRECT_BLOCKED", nextAuthorization.reasonCode ?? "The Asset redirect target is not authorized");
        redirectChain.push(finalUrl);
        finalUrl = nextUrl;
        permit.release();
        continue;
      }
      if (response.status === 416) {
        await drain(response.body);
        if (offset === 0 || restarted) throw new AssetOperationError("ASSET_RANGE_INVALID", "The Asset server rejected the bounded Range request", true);
        restarted = true;
        offset = 0;
        const truncateHandle = await input.fileStore.openFile(input.projectRoot, partialRelativePath);
        await truncateHandle.truncate(0);
        await truncateHandle.close();
        permit.release();
        continue;
      }
      if (response.status < 200 || response.status >= 300) {
        await drain(response.body);
        throw new AssetOperationError("ASSET_NETWORK_FAILED", `The Asset server returned HTTP ${response.status}`, response.status === 429 || response.status === 503);
      }
      const responseEtag = normalizeAssetValidator(header(response.headers, "etag"));
      const responseLastModified = normalizeAssetValidator(header(response.headers, "last-modified"));
      const responseValidator = responseEtag ?? responseLastModified;
      contentType = normalizeAssetContentType(header(response.headers, "content-type"));
      const contentRange = parseAssetContentRange(header(response.headers, "content-range"));
      if (offset > 0 && response.status === 206) {
        if (contentRange === null || contentRange.start !== offset) throw new AssetOperationError("ASSET_RANGE_INVALID", "The Asset server returned an incompatible Content-Range", true);
        if (validator !== null && responseValidator !== null && validator !== responseValidator) {
          if (restarted) throw new AssetOperationError("ASSET_VALIDATOR_CHANGED", "The Asset validator changed during Asset resume");
          restarted = true;
          offset = 0;
          const truncateHandle = await input.fileStore.openFile(input.projectRoot, partialRelativePath);
          await truncateHandle.truncate(0);
          await truncateHandle.close();
          permit.release();
          continue;
        }
        expectedBytes = contentRange.total ?? expectedBytes;
      } else if (offset > 0 && response.status === 200) {
        if (restarted) throw new AssetOperationError("ASSET_RANGE_INVALID", "The Asset server repeatedly ignored the bounded Range request", true);
        restarted = true;
        offset = 0;
        const truncateHandle = await input.fileStore.openFile(input.projectRoot, partialRelativePath);
        await truncateHandle.truncate(0);
        await truncateHandle.close();
        expectedBytes = null;
      } else if (response.status === 206) {
        if (contentRange === null || contentRange.start !== 0) throw new AssetOperationError("ASSET_RANGE_INVALID", "The initial Asset response returned an invalid Content-Range");
        expectedBytes = contentRange.total;
      }
      const contentLength = header(response.headers, "content-length");
      const parsedLength = contentLength === null ? null : Number(contentLength);
      if (parsedLength !== null && Number.isSafeInteger(parsedLength) && parsedLength >= 0 && (response.status !== 206 || expectedBytes === null)) expectedBytes = offset + parsedLength;
      if (expectedBytes !== null && expectedBytes > maximumBytes) throw new AssetOperationError("ASSET_MAXIMUM_SIZE_EXCEEDED", "The Asset response exceeds the configured maximum size");
      validator = responseValidator ?? validator;
      etag = responseEtag ?? etag;
      lastModified = responseLastModified ?? lastModified;
      const handle = await input.fileStore.openFile(input.projectRoot, partialRelativePath);
      await handle.truncate(offset);
      let written = offset;
      try {
        for await (const rawChunk of response.body) {
          if (signal?.aborted) throw new AssetOperationError("ASSET_CANCELLED", "The Asset operation was cancelled");
          const chunk = asBytes(rawChunk);
          if (written + chunk.byteLength > maximumBytes || (expectedBytes !== null && written + chunk.byteLength > expectedBytes)) throw new AssetOperationError("ASSET_SIZE_MISMATCH", "The Asset response exceeded its declared size");
          written += await writeChunk(handle, chunk, written);
          if (written - checkpointAt >= checkpointInterval) {
            await handle.sync();
            await input.storage.saveAssetProgress({ ...input.lease, assetSourceId: claimed.assetSourceId, partialRelativePath, bytesWritten: written, expectedBytes, validator, etag, lastModified, resumeOffset: written, operationId: input.operationId });
            await checkpoint(input, claimed, partialRelativePath, written, expectedBytes, validator, written, false, null);
            await input.heartbeat();
            checkpointAt = written;
          }
        }
        await handle.sync();
      } finally {
        await handle.close();
      }
      if (expectedBytes !== null && written !== expectedBytes) throw new AssetOperationError("ASSET_SIZE_MISMATCH", `The Asset size ${written} did not match the expected ${expectedBytes}`, true);
      await input.storage.saveAssetProgress({ ...input.lease, assetSourceId: claimed.assetSourceId, partialRelativePath, bytesWritten: written, expectedBytes, validator, etag, lastModified, resumeOffset: written, operationId: input.operationId });
      await checkpoint(input, claimed, partialRelativePath, written, expectedBytes, validator, written, false, null);
      offset = written;
      statusCode = response.status;
      break;
    } catch (error) {
      if (error instanceof AssetOperationError) throw error;
      throw new AssetOperationError("ASSET_NETWORK_FAILED", error instanceof Error ? error.message : "The Asset response stream failed", true);
    } finally {
      permit.release();
    }
  }

  if (expectedBytes !== null && offset !== expectedBytes) throw new AssetOperationError("ASSET_SIZE_MISMATCH", "The Asset final size is not complete");
  const hashed = await hashFile(input.fileStore, input.projectRoot, partialRelativePath, maximumBytes);
  const contentPath = canonicalAssetContentPath(hashed.sha256);
  await input.storage.assertAssetFinalizationOwnership({ ...input.lease, assetSourceId: claimed.assetSourceId });
  const finalized = await withContentLock(input.fileStore, input.projectRoot, hashed.sha256, input.operationId, signal, async () => {
    const known = await input.storage.getAssetContent({ projectId: input.lease.projectId, sha256: hashed.sha256 });
    if (known !== null && known.storageRelativePath !== contentPath) throw new AssetOperationError("ASSET_CONTENT_CONFLICT", "The Asset content path conflicts with the persisted content identity");
    let finalExists = false;
    const existingStat = await input.fileStore.stat(input.projectRoot, contentPath);
    if (existingStat !== null) {
      const existing = await hashFile(input.fileStore, input.projectRoot, contentPath, maximumBytes);
      finalExists = existing.sha256 === hashed.sha256 && existing.byteLength === hashed.byteLength;
      if (!finalExists) throw new AssetOperationError("ASSET_CONTENT_CONFLICT", "The Asset content path already contains different bytes");
    }
    if (!finalExists) {
      await input.fileStore.promote(input.projectRoot, partialRelativePath, contentPath);
    } else {
      await removeProjectFile(input.fileStore, input.projectRoot, partialRelativePath);
    }
    const contentResult = await input.storage.finalizeAssetDownload({ ...input.lease, assetSourceId: claimed.assetSourceId, statusCode, finalUrl, redirectChain, contentType, byteLength: hashed.byteLength, sha256: hashed.sha256, storageRelativePath: contentPath, operationId: input.operationId, completedAt: now() });
    await checkpoint(input, contentResult.source, contentPath, hashed.byteLength, hashed.byteLength, validator, hashed.byteLength, true, hashed.sha256);
    if (input.recovery !== undefined) {
      await input.recovery.saveCompletedOutputs({
        projectId: input.lease.projectId,
        runId: input.lease.runId,
        jobId: input.lease.jobId,
        leaseToken: input.lease.leaseToken,
        fencingGeneration: input.lease.fencingGeneration,
        ownerId: input.lease.ownerId,
        outputs: [{ relativePath: contentPath, byteLength: hashed.byteLength, sha256: hashed.sha256, verificationPolicy: "size-and-sha256" }],
        operationId: input.operationId,
      });
    }
    return contentResult;
  });
  return { source: finalized.source, content: finalized.content, reused: false, deduplicated: finalized.deduplicated, finalUrl, redirectChain, byteLength: hashed.byteLength };
}

export async function downloadAsset(input: AssetDownloadInput): Promise<AssetDownloadResult> {
  try {
    return await downloadAssetInternal(input);
  } catch (error) {
    try {
      const source = await input.storage.ensureAssetSource(input.asset);
      if (source.state === "downloading" && source.claimJobId === input.lease.jobId && source.claimedBy === input.lease.ownerId) {
        await input.storage.markAssetInterrupted({ ...input.lease, assetSourceId: source.assetSourceId, errorCode: error instanceof AssetOperationError ? error.code : "ASSET_NETWORK_FAILED", operationId: input.operationId });
      }
    } catch {
      // Preserve the original failure; a newer owner may have fenced this worker.
    }
    if (error instanceof AssetOperationError) throw error;
    throw new AssetOperationError("ASSET_NETWORK_FAILED", error instanceof Error ? error.message : "The Asset download failed", true);
  }
}
