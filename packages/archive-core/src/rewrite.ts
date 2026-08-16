import { canonicalRelativePath, canonicalPathCollisionKey, validateCanonicalRelativePath } from "./path-safety.js";
import type { AssetSource } from "./assets.js";

export const HTML_REWRITE_CONTRACT_VERSION = 1 as const;
export const ROUTE_MAP_VERSION = 1 as const;
export const EXTERNAL_DEPENDENCY_MAP_VERSION = 1 as const;
export const ORIGINAL_RESOURCE_MAP_VERSION = 1 as const;

export const REWRITE_LIMITS = Object.freeze({
  maximumHtmlBytes: 16 * 1024 * 1024,
  maximumCssBytes: 4 * 1024 * 1024,
  maximumReferenceLength: 8_192,
  maximumDependencyCount: 10_000,
  maximumRouteCount: 100_000,
});

export type RewriteResourceKind = "page" | "asset" | "canonical" | "css" | "json" | "api" | "other";
export type RouteType = "root" | "extensionless" | "document" | "spa";
export type RouteResolutionState = "local-match" | "collision" | "unresolved";
export type DependencyClassification =
  | "local-match"
  | "missing-local-resource"
  | "external-not-archived"
  | "out-of-scope"
  | "unsupported-scheme"
  | "blocked-by-policy"
  | "unresolved"
  | "future-network-replay-candidate"
  | "preserved-scheme";

export type RewriteOperationErrorCode =
  | "REWRITE_INPUT_INVALID"
  | "REWRITE_HTML_TOO_LARGE"
  | "REWRITE_CSS_TOO_LARGE"
  | "REWRITE_URL_INVALID"
  | "REWRITE_PATH_UNSAFE"
  | "REWRITE_ROUTE_COLLISION"
  | "REWRITE_DEPENDENCY_LIMIT_EXCEEDED";

export class RewriteOperationError extends Error {
  public constructor(public readonly code: RewriteOperationErrorCode, message: string) {
    super(message);
    this.name = "RewriteOperationError";
  }
}

export interface RewriteUrlNormalizer {
  (url: string): string | null;
}

export interface PageRouteMappingInput {
  readonly projectId: string;
  readonly runId: string;
  readonly projectRevisionId: string;
  readonly pageId: string;
  readonly originalUrl: string;
  readonly normalizedUrl: string;
  readonly identityHash: string;
  readonly localRoute: string;
  readonly localResource: string;
  readonly routeType?: RouteType;
  readonly spaFallback?: SpaFallbackMetadata | null;
}

export interface SpaFallbackMetadata {
  readonly mode: "entry-document";
  readonly entryPageId: string;
  readonly entryRoute: string;
  readonly entryResource: string;
}

export interface AssetResourceMappingInput {
  readonly projectId: string;
  readonly runId: string;
  readonly projectRevisionId: string;
  readonly assetSourceId: string;
  readonly originalUrl: string;
  readonly normalizedUrl: string;
  readonly identityHash: string;
  readonly assetType: string;
  readonly localResource: string;
  readonly localReference?: string;
  readonly finalized: boolean;
  readonly contentId?: string | null;
  readonly contentSha256?: string | null;
}

export interface ArchivedAssetMapping extends AssetResourceMappingInput {
  readonly localReference: string;
}

export interface ArchivedPageMapping extends PageRouteMappingInput {
  readonly routeType: RouteType;
  readonly spaFallback: SpaFallbackMetadata | null;
}

export interface OriginalResourceMapping {
  readonly kind: "page" | "asset";
  readonly entityId: string;
  readonly projectId: string;
  readonly runId: string;
  readonly projectRevisionId: string;
  readonly originalUrl: string;
  readonly normalizedUrl: string;
  readonly identityHash: string;
  readonly localResource: string;
  readonly localRoute: string | null;
  readonly resolutionState: "local-match" | "unresolved";
}

export interface RouteMapEntry {
  readonly routeId: string;
  readonly originalUrl: string;
  readonly normalizedUrl: string;
  readonly pageId: string;
  readonly pageIdentity: string;
  readonly projectId: string;
  readonly runId: string;
  readonly projectRevisionId: string;
  readonly localRoute: string;
  readonly localResource: string;
  readonly routeType: RouteType;
  readonly resolutionState: RouteResolutionState;
  readonly fallback: SpaFallbackMetadata | null;
}

export interface RouteCollision {
  readonly collisionKey: string;
  readonly kind: "route" | "original-url" | "local-resource";
  readonly routeIds: readonly string[];
  readonly reason: "case-or-unicode" | "duplicate-original" | "shared-local-resource";
}

export interface RouteMap {
  readonly version: typeof ROUTE_MAP_VERSION;
  readonly rewriteContractVersion: typeof HTML_REWRITE_CONTRACT_VERSION;
  readonly projectId: string;
  readonly runId: string;
  readonly projectRevisionId: string;
  readonly trailingSlashPolicy: "preserve";
  readonly routes: readonly RouteMapEntry[];
  readonly collisions: readonly RouteCollision[];
}

export interface ExternalDependency {
  readonly dependencyId: string;
  readonly sourcePageId: string;
  readonly sourcePageIdentity: string;
  readonly projectId: string;
  readonly runId: string;
  readonly projectRevisionId: string;
  readonly rawReference: string;
  readonly resolvedUrl: string | null;
  readonly normalizedUrl: string | null;
  readonly element: string;
  readonly attribute: string;
  readonly resourceKind: RewriteResourceKind;
  readonly classification: DependencyClassification;
  readonly policyReason: string;
}

export interface ExternalDependencyMap {
  readonly version: typeof EXTERNAL_DEPENDENCY_MAP_VERSION;
  readonly rewriteContractVersion: typeof HTML_REWRITE_CONTRACT_VERSION;
  readonly dependencies: readonly ExternalDependency[];
}

export interface RewriteReferenceObservation {
  readonly sourcePageId: string;
  readonly element: string;
  readonly attribute: string;
  readonly rawReference: string;
  readonly resolvedUrl: string | null;
  readonly normalizedUrl: string | null;
  readonly localResource: string | null;
  readonly classification: DependencyClassification | "preserved";
  readonly alreadyLocal: boolean;
}

export interface CanonicalReferenceObservation {
  readonly rawReference: string;
  readonly resolvedUrl: string | null;
  readonly normalizedUrl: string | null;
  readonly originalPreserved: true;
}

export interface RewritePageInput {
  readonly pageId: string;
  readonly projectId: string;
  readonly runId: string;
  readonly projectRevisionId: string;
  readonly pageIdentity: string;
  readonly originalUrl: string;
  readonly normalizedUrl: string;
  readonly localResource: string;
}

export interface HtmlRewriteInput {
  readonly html: string;
  readonly documentUrl: string;
  readonly page: RewritePageInput;
  readonly mappings: RewriteMappingIndex;
}

export interface HtmlRewriteArtifact {
  readonly contractVersion: typeof HTML_REWRITE_CONTRACT_VERSION;
  readonly relativePath: string;
  readonly byteLength: number;
  readonly sha256: string;
}

export interface HtmlRewriteArtifactStore {
  write(input: { readonly projectRoot: string; readonly jobId: string; readonly html: string }): Promise<HtmlRewriteArtifact>;
}

export interface HtmlRewriteResult {
  readonly contractVersion: typeof HTML_REWRITE_CONTRACT_VERSION;
  readonly html: string;
  readonly page: RewritePageInput;
  readonly effectiveBaseUrl: string;
  readonly originalBaseUrl: string | null;
  readonly removedBaseElement: boolean;
  readonly references: readonly RewriteReferenceObservation[];
  readonly canonicalReferences: readonly CanonicalReferenceObservation[];
  readonly dependencies: ExternalDependencyMap;
  readonly originalResourceMap: OriginalResourceMap;
  readonly rewrittenReferenceCount: number;
}

export interface CssRewriteInput {
  readonly css: string;
  readonly cssUrl: string;
  readonly sourcePage: RewritePageInput;
  readonly mappings: RewriteMappingIndex;
}

export interface CssRewriteResult {
  readonly contractVersion: typeof HTML_REWRITE_CONTRACT_VERSION;
  readonly css: string;
  readonly cssUrl: string;
  readonly references: readonly RewriteReferenceObservation[];
  readonly dependencies: ExternalDependencyMap;
  readonly rewrittenReferenceCount: number;
}

export interface OriginalResourceMap {
  readonly version: typeof ORIGINAL_RESOURCE_MAP_VERSION;
  readonly rewriteContractVersion: typeof HTML_REWRITE_CONTRACT_VERSION;
  readonly resources: readonly OriginalResourceMapping[];
}

interface MappingIndexEntry {
  readonly mapping: ArchivedPageMapping | ArchivedAssetMapping;
  readonly lookupKey: string;
}

interface ResolvedReference {
  readonly raw: string;
  readonly trimmed: string;
  readonly scheme: string | null;
  readonly resolvedUrl: string | null;
  readonly normalizedUrl: string | null;
  readonly fragment: string;
  readonly search: string;
  readonly isFragmentOnly: boolean;
}

interface HtmlAttribute {
  readonly name: string;
  readonly value: string | null;
  readonly valueStart: number | null;
  readonly valueEnd: number | null;
  readonly quote: "'" | '"' | null;
}

interface HtmlToken {
  readonly start: number;
  readonly end: number;
  readonly tagName: string | null;
  readonly attributes: readonly HtmlAttribute[];
  readonly isStartTag: boolean;
  readonly isEndTag: boolean;
}

interface LocalMappingResult {
  readonly mapping: ArchivedPageMapping | ArchivedAssetMapping;
  readonly localReference: string;
}

const HTTP_SCHEMES = new Set(["http:", "https:"]);
const SPECIAL_PRESERVED_SCHEMES = new Set(["mailto:", "tel:", "javascript:", "data:", "about:"]);
const URL_ATTRIBUTE_RULES: Readonly<Record<string, Readonly<Record<string, RewriteResourceKind>>>> = Object.freeze({
  a: { href: "page" },
  area: { href: "page" },
  img: { src: "asset", srcset: "asset" },
  script: { src: "asset" },
  link: { href: "asset" },
  source: { src: "asset", srcset: "asset" },
  video: { src: "asset", poster: "asset" },
  audio: { src: "asset" },
  iframe: { src: "page" },
  form: { action: "page" },
  object: { data: "asset" },
  embed: { src: "asset" },
  track: { src: "asset" },
  input: { src: "asset" },
  image: { href: "asset", "xlink:href": "asset" },
  use: { href: "asset", "xlink:href": "asset" },
});
const SENSITIVE_QUERY_KEY = /^(?:access[_-]?token|api[_-]?key|authorization|auth|code|cookie|credential|csrf|jwt|otp|pass(?:word)?|secret|session|token)$/i;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;
const SCHEME_PATTERN = /^([A-Za-z][A-Za-z0-9+.-]*):/;

function invalid(message: string): never {
  throw new RewriteOperationError("REWRITE_INPUT_INVALID", message);
}

function compare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertText(value: string, label: string, maximum: number = REWRITE_LIMITS.maximumReferenceLength): string {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum || CONTROL_CHARACTER.test(value)) invalid(`${label} is invalid`);
  return value;
}

function assertHttpUrl(value: string, label: string): string {
  assertText(value, label, 8_192);
  if (value.includes("\\")) throw new RewriteOperationError("REWRITE_URL_INVALID", `${label} contains a backslash`);
  let url: URL;
  try { url = new URL(value); }
  catch { throw new RewriteOperationError("REWRITE_URL_INVALID", `${label} is not an absolute URL`); }
  if (!HTTP_SCHEMES.has(url.protocol) || url.username !== "" || url.password !== "") {
    throw new RewriteOperationError("REWRITE_URL_INVALID", `${label} must be credential-free HTTP(S)`);
  }
  return value;
}

function safeMetadataUrl(value: string | null): string | null {
  if (value === null) return null;
  let url: URL;
  try { url = new URL(value); }
  catch { return value.slice(0, REWRITE_LIMITS.maximumReferenceLength); }
  if (url.username !== "" || url.password !== "") {
    url.username = "";
    url.password = "";
  }
  const entries = [...url.searchParams.entries()].map(([key, parameterValue]) => [key, SENSITIVE_QUERY_KEY.test(key) ? "[redacted]" : parameterValue] as const);
  url.search = "";
  for (const [key, parameterValue] of entries) url.searchParams.append(key, parameterValue);
  return url.toString().slice(0, REWRITE_LIMITS.maximumReferenceLength);
}

function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#34;", '"')
    .replaceAll("&#x22;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function escapeAttributeValue(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function normalizeRewriteUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (!HTTP_SCHEMES.has(url.protocol) || url.username !== "" || url.password !== "") return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function canonicalLocalRoute(value: string): string {
  assertText(value, "The local route", 2_048);
  if (value === "/") return value;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("?") || value.includes("#")) {
    throw new RewriteOperationError("REWRITE_PATH_UNSAFE", "The local route must be a portable root-relative route");
  }
  const trailingSlash = value.endsWith("/");
  const routePath = trailingSlash ? value.slice(0, -1) : value;
  if (routePath.length === 0) return "/";
  const validation = validateCanonicalRelativePath(routePath.slice(1));
  if (!validation.valid || validation.normalized === null) throw new RewriteOperationError("REWRITE_PATH_UNSAFE", validation.message);
  return `/${validation.normalized}${trailingSlash ? "/" : ""}`;
}

function canonicalLocalReference(value: string): string {
  assertText(value, "The local reference", 2_048);
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) throw new RewriteOperationError("REWRITE_PATH_UNSAFE", "Local references must be root-relative and portable");
  const parsed = new URL(value, "https://offline.invalid");
  if (parsed.origin !== "https://offline.invalid" || parsed.username !== "" || parsed.password !== "") throw new RewriteOperationError("REWRITE_PATH_UNSAFE", "Local references cannot contain an origin or credentials");
  const pathValue = parsed.pathname;
  if (pathValue === "/") return value;
  const validation = validateCanonicalRelativePath(pathValue.slice(1));
  if (!validation.valid || validation.normalized === null) throw new RewriteOperationError("REWRITE_PATH_UNSAFE", validation.message);
  return `/${validation.normalized}${parsed.search}${parsed.hash}`;
}

function canonicalResourcePath(value: string): string {
  try { return canonicalRelativePath(assertText(value, "The local resource", 2_048)); }
  catch (error) {
    if (error instanceof RewriteOperationError) throw error;
    const message = error instanceof Error ? error.message : "The local resource path is unsafe";
    throw new RewriteOperationError("REWRITE_PATH_UNSAFE", message);
  }
}

function routeTypeFor(mapping: PageRouteMappingInput): RouteType {
  if (mapping.routeType !== undefined) return mapping.routeType;
  const parsed = new URL(mapping.normalizedUrl);
  if (parsed.pathname === "/") return "root";
  const lastSegment = parsed.pathname.split("/").filter(Boolean).at(-1) ?? "";
  return lastSegment.includes(".") ? "document" : "extensionless";
}

function validateSpaFallback(value: SpaFallbackMetadata | null | undefined): SpaFallbackMetadata | null {
  if (value === undefined || value === null) return null;
  assertText(value.entryPageId, "The SPA entry page identifier", 128);
  return Object.freeze({
    mode: "entry-document",
    entryPageId: value.entryPageId,
    entryRoute: canonicalLocalRoute(value.entryRoute),
    entryResource: canonicalResourcePath(value.entryResource),
  });
}

function archivedPageMapping(input: PageRouteMappingInput): ArchivedPageMapping {
  const originalUrl = assertHttpUrl(input.originalUrl, "The page original URL");
  const normalizedUrl = assertHttpUrl(input.normalizedUrl, "The page normalized URL");
  assertText(input.projectId, "The project identifier", 128);
  assertText(input.runId, "The run identifier", 128);
  assertText(input.projectRevisionId, "The project revision identifier", 128);
  assertText(input.pageId, "The page identifier", 128);
  assertText(input.identityHash, "The page identity", 128);
  return Object.freeze({
    ...input,
    originalUrl,
    normalizedUrl,
    localRoute: canonicalLocalRoute(input.localRoute),
    localResource: canonicalResourcePath(input.localResource),
    routeType: routeTypeFor(input),
    spaFallback: validateSpaFallback(input.spaFallback),
  });
}

function archivedAssetMapping(input: AssetResourceMappingInput): ArchivedAssetMapping | null {
  if (!input.finalized) return null;
  const originalUrl = assertHttpUrl(input.originalUrl, "The Asset original URL");
  const normalizedUrl = assertHttpUrl(input.normalizedUrl, "The Asset normalized URL");
  assertText(input.projectId, "The project identifier", 128);
  assertText(input.runId, "The run identifier", 128);
  assertText(input.projectRevisionId, "The project revision identifier", 128);
  assertText(input.assetSourceId, "The Asset source identifier", 128);
  assertText(input.identityHash, "The Asset identity", 128);
  const localResource = canonicalResourcePath(input.localResource);
  const localReference = input.localReference === undefined ? `/${localResource}` : canonicalLocalReference(input.localReference);
  return Object.freeze({ ...input, originalUrl, normalizedUrl, localResource, localReference });
}

export function archivedAssetMappingFromPhase17(source: Pick<AssetSource, "projectId" | "runId" | "projectRevisionId" | "assetSourceId" | "originalUrl" | "normalizedUrl" | "identityHash" | "assetType" | "state" | "storageRelativePath" | "content">): ArchivedAssetMapping | null {
  if (source.state !== "completed" || source.storageRelativePath === null || source.content === null) return null;
  return archivedAssetMapping({
    projectId: source.projectId,
    runId: source.runId,
    projectRevisionId: source.projectRevisionId,
    assetSourceId: source.assetSourceId,
    originalUrl: source.originalUrl,
    normalizedUrl: source.normalizedUrl,
    identityHash: source.identityHash,
    assetType: source.assetType,
    localResource: source.storageRelativePath,
    finalized: true,
    contentId: source.content.contentId,
    contentSha256: source.content.sha256,
  });
}

function mappingLookupKey(value: string, normalizer: RewriteUrlNormalizer): string {
  const key = normalizer(value);
  if (key === null) throw new RewriteOperationError("REWRITE_URL_INVALID", "A mapping URL cannot be normalized by the configured URL contract");
  return key;
}

function isArchivedPageMapping(mapping: ArchivedPageMapping | ArchivedAssetMapping): mapping is ArchivedPageMapping {
  return "pageId" in mapping;
}

function mappingKind(mapping: ArchivedPageMapping | ArchivedAssetMapping): "page" | "asset" {
  return isArchivedPageMapping(mapping) ? "page" : "asset";
}

function localReferenceFor(mapping: ArchivedPageMapping | ArchivedAssetMapping): string {
  return isArchivedPageMapping(mapping) ? mapping.localRoute : mapping.localReference;
}

function routeCollisionKey(value: string): string {
  if (value === "/") return "/";
  const pathValue = value.endsWith("/") ? value.slice(0, -1) : value;
  return `${pathValue.normalize("NFC").toLocaleLowerCase("en-US")}${value.endsWith("/") ? "/" : ""}`;
}

export class RewriteMappingIndex {
  public readonly pages: readonly ArchivedPageMapping[];
  public readonly assets: readonly ArchivedAssetMapping[];
  private readonly normalizer: RewriteUrlNormalizer;
  private readonly byUrl = new Map<string, readonly MappingIndexEntry[]>();
  private readonly localReferences = new Set<string>();

  public constructor(input: { readonly pages: readonly PageRouteMappingInput[]; readonly assets: readonly AssetResourceMappingInput[]; readonly normalizer?: RewriteUrlNormalizer }) {
    this.normalizer = input.normalizer ?? normalizeRewriteUrl;
    const pages = input.pages.map(archivedPageMapping).sort((left, right) => compare(left.normalizedUrl, right.normalizedUrl) || compare(left.pageId, right.pageId));
    const assets = input.assets.map(archivedAssetMapping).filter((value): value is ArchivedAssetMapping => value !== null).sort((left, right) => compare(left.normalizedUrl, right.normalizedUrl) || compare(left.assetSourceId, right.assetSourceId));
    this.pages = Object.freeze(pages);
    this.assets = Object.freeze(assets);
    const entries = [...pages.map((mapping) => ({ mapping, lookupKey: mappingLookupKey(mapping.normalizedUrl, this.normalizer) })), ...assets.map((mapping) => ({ mapping, lookupKey: mappingLookupKey(mapping.normalizedUrl, this.normalizer) }))];
    for (const entry of entries) {
      const current = this.byUrl.get(entry.lookupKey) ?? [];
      this.byUrl.set(entry.lookupKey, [...current, entry]);
      this.localReferences.add(localReferenceFor(entry.mapping));
    }
  }

  public lookup(url: string): LocalMappingResult | null {
    const key = this.normalizer(url);
    if (key === null) return null;
    const entries = this.byUrl.get(key) ?? [];
    if (entries.length !== 1) return null;
    const entry = entries[0];
    if (entry === undefined) return null;
    return { mapping: entry.mapping, localReference: localReferenceFor(entry.mapping) };
  }

  public hasLocalReference(value: string): boolean {
    try {
      const parsed = new URL(value, "https://offline.invalid");
      if (parsed.origin !== "https://offline.invalid") return false;
      return this.localReferences.has(canonicalLocalReference(parsed.pathname));
    } catch {
      return false;
    }
  }

  public isAmbiguous(url: string): boolean {
    const key = this.normalizer(url);
    return key !== null && (this.byUrl.get(key)?.length ?? 0) > 1;
  }

  public originalResourceMap(): OriginalResourceMap {
    return createOriginalResourceMap([...this.pages, ...this.assets]);
  }
}

export function createRewriteMappingIndex(input: ConstructorParameters<typeof RewriteMappingIndex>[0]): RewriteMappingIndex {
  return new RewriteMappingIndex(input);
}

function routeEntry(input: ArchivedPageMapping): RouteMapEntry {
  const routeId = `route:${input.pageId}:${input.identityHash}`;
  return Object.freeze({
    routeId,
    originalUrl: input.originalUrl,
    normalizedUrl: input.normalizedUrl,
    pageId: input.pageId,
    pageIdentity: input.identityHash,
    projectId: input.projectId,
    runId: input.runId,
    projectRevisionId: input.projectRevisionId,
    localRoute: input.localRoute,
    localResource: input.localResource,
    routeType: input.routeType,
    resolutionState: "local-match",
    fallback: input.spaFallback,
  });
}

export function generateRouteMap(input: { readonly pages: readonly PageRouteMappingInput[]; readonly projectId: string; readonly runId: string; readonly projectRevisionId: string }): RouteMap {
  if (input.pages.length > REWRITE_LIMITS.maximumRouteCount) throw new RewriteOperationError("REWRITE_INPUT_INVALID", "The Route Map exceeds its configured bound");
  const entries = input.pages.map(archivedPageMapping).map(routeEntry).sort((left, right) => compare(left.normalizedUrl, right.normalizedUrl) || compare(left.routeId, right.routeId));
  const collisionGroups = new Map<string, { kind: RouteCollision["kind"]; reason: RouteCollision["reason"]; routeIds: string[] }>();
  const mark = (key: string, kind: RouteCollision["kind"], reason: RouteCollision["reason"], routeId: string) => {
    const current = collisionGroups.get(`${kind}:${key}`) ?? { kind, reason, routeIds: [] };
    if (!current.routeIds.includes(routeId)) current.routeIds.push(routeId);
    collisionGroups.set(`${kind}:${key}`, current);
  };
  const byRoute = new Map<string, RouteMapEntry[]>();
  const byOriginal = new Map<string, RouteMapEntry[]>();
  const byResource = new Map<string, RouteMapEntry[]>();
  for (const entry of entries) {
    const routeKey = routeCollisionKey(entry.localRoute);
    const originalKey = normalizeRewriteUrl(entry.normalizedUrl) ?? entry.normalizedUrl;
    const routeGroup = byRoute.get(routeKey) ?? [];
    routeGroup.push(entry);
    byRoute.set(routeKey, routeGroup);
    const originalGroup = byOriginal.get(originalKey) ?? [];
    originalGroup.push(entry);
    byOriginal.set(originalKey, originalGroup);
    const resourceGroup = byResource.get(entry.localResource) ?? [];
    resourceGroup.push(entry);
    byResource.set(entry.localResource, resourceGroup);
  }
  for (const [key, group] of byRoute) {
    const distinct = new Set(group.map((entry) => entry.localRoute));
    if (group.length > 1 && (distinct.size > 1 || new Set(group.map((entry) => entry.pageIdentity)).size > 1)) {
      for (const entry of group) mark(key, "route", "case-or-unicode", entry.routeId);
    }
  }
  for (const [key, group] of byOriginal) {
    if (new Set(group.map((entry) => entry.pageIdentity)).size > 1) for (const entry of group) mark(key, "original-url", "duplicate-original", entry.routeId);
  }
  for (const [key, group] of byResource) {
    const distinctRoutes = new Set(group.map((entry) => entry.localRoute));
    const distinctPages = new Set(group.map((entry) => entry.pageIdentity));
    const hasSharedSpaEntry = group.every((entry) => entry.routeType === "spa" || entry.fallback !== null);
    if (!hasSharedSpaEntry && distinctRoutes.size > 1 && distinctPages.size > 1) for (const entry of group) mark(key, "local-resource", "shared-local-resource", entry.routeId);
  }
  const collisions = [...collisionGroups.entries()].map(([key, group]) => ({ collisionKey: key.slice(key.indexOf(":") + 1), kind: group.kind, routeIds: [...group.routeIds].sort(compare), reason: group.reason } as RouteCollision)).sort((left, right) => compare(left.kind, right.kind) || compare(left.collisionKey, right.collisionKey));
  const collisionIds = new Set(collisions.flatMap((collision) => collision.routeIds));
  const resolvedRoutes = entries.map((entry) => collisionIds.has(entry.routeId) ? Object.freeze({ ...entry, resolutionState: "collision" as const }) : entry);
  return Object.freeze({ version: ROUTE_MAP_VERSION, rewriteContractVersion: HTML_REWRITE_CONTRACT_VERSION, projectId: assertText(input.projectId, "The project identifier", 128), runId: assertText(input.runId, "The run identifier", 128), projectRevisionId: assertText(input.projectRevisionId, "The project revision identifier", 128), trailingSlashPolicy: "preserve", routes: Object.freeze(resolvedRoutes), collisions: Object.freeze(collisions) });
}

function sortResourceMappings(values: readonly (ArchivedPageMapping | ArchivedAssetMapping)[]): readonly OriginalResourceMapping[] {
  const resources = values.map((mapping): OriginalResourceMapping => isArchivedPageMapping(mapping)
    ? { kind: "page", entityId: mapping.pageId, projectId: mapping.projectId, runId: mapping.runId, projectRevisionId: mapping.projectRevisionId, originalUrl: mapping.originalUrl, normalizedUrl: mapping.normalizedUrl, identityHash: mapping.identityHash, localResource: mapping.localResource, localRoute: mapping.localRoute, resolutionState: "local-match" }
    : { kind: "asset", entityId: mapping.assetSourceId, projectId: mapping.projectId, runId: mapping.runId, projectRevisionId: mapping.projectRevisionId, originalUrl: mapping.originalUrl, normalizedUrl: mapping.normalizedUrl, identityHash: mapping.identityHash, localResource: mapping.localResource, localRoute: null, resolutionState: "local-match" });
  return Object.freeze(resources.sort((left, right) => compare(left.kind, right.kind) || compare(left.normalizedUrl, right.normalizedUrl) || compare(left.entityId, right.entityId)));
}

export function createOriginalResourceMap(values: readonly (PageRouteMappingInput | AssetResourceMappingInput | ArchivedPageMapping | ArchivedAssetMapping)[]): OriginalResourceMap {
  const mappings: (ArchivedPageMapping | ArchivedAssetMapping)[] = [];
  for (const value of values) {
    if ("pageId" in value) mappings.push("routeType" in value && "spaFallback" in value && value.spaFallback !== undefined && (value as ArchivedPageMapping).spaFallback !== undefined ? value as ArchivedPageMapping : archivedPageMapping(value as PageRouteMappingInput));
    else {
      const mapped = "localReference" in value && typeof value.localReference === "string" && "finalized" in value && (value as ArchivedAssetMapping).finalized ? value as ArchivedAssetMapping : archivedAssetMapping(value as AssetResourceMappingInput);
      if (mapped !== null) mappings.push(mapped);
    }
  }
  return Object.freeze({ version: ORIGINAL_RESOURCE_MAP_VERSION, rewriteContractVersion: HTML_REWRITE_CONTRACT_VERSION, resources: sortResourceMappings(mappings) });
}

export function serializeRouteMap(value: RouteMap): string {
  return JSON.stringify(value);
}

export function serializeOriginalResourceMap(value: OriginalResourceMap): string {
  return JSON.stringify(value);
}

export function serializeExternalDependencyMap(value: ExternalDependencyMap): string {
  return JSON.stringify(value);
}

function dependencyId(input: Omit<ExternalDependency, "dependencyId">): string {
  return [input.sourcePageId, input.element, input.attribute, input.rawReference, input.normalizedUrl ?? "", input.classification].join("|");
}

function dependency(input: Omit<ExternalDependency, "dependencyId">): ExternalDependency {
  return Object.freeze({ ...input, dependencyId: dependencyId(input) });
}

function dependencyMap(sourcePage: RewritePageInput, values: readonly ExternalDependency[]): ExternalDependencyMap {
  if (values.length > REWRITE_LIMITS.maximumDependencyCount) throw new RewriteOperationError("REWRITE_DEPENDENCY_LIMIT_EXCEEDED", "The External Dependency Map exceeds its configured bound");
  const dependencies = [...values].sort((left, right) => compare(left.dependencyId, right.dependencyId));
  return Object.freeze({ version: EXTERNAL_DEPENDENCY_MAP_VERSION, rewriteContractVersion: HTML_REWRITE_CONTRACT_VERSION, dependencies: Object.freeze(dependencies) });
}

function resourceKindForTag(tagName: string, attribute: string): RewriteResourceKind | null {
  const rule = URL_ATTRIBUTE_RULES[tagName];
  if (rule === undefined) return null;
  return rule[attribute] ?? (attribute === "xlink:href" && (tagName === "image" || tagName === "use") ? "asset" : null);
}

function isCanonicalLink(tagName: string, attributes: readonly HtmlAttribute[]): boolean {
  if (tagName !== "link") return false;
  const rel = attributes.find((attribute) => attribute.name === "rel")?.value;
  return rel !== null && rel !== undefined && rel.split(/\s+/u).some((value) => value.toLowerCase() === "canonical");
}

function findAttribute(attributes: readonly HtmlAttribute[], name: string): HtmlAttribute | null {
  return attributes.find((attribute) => attribute.name === name) ?? null;
}

function findTagEnd(text: string, start: number): number {
  let quote: string | null = null;
  for (let index = start + 1; index < text.length; index += 1) {
    const character = text[index];
    if (quote !== null) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"') { quote = character; continue; }
    if (character === ">") return index + 1;
  }
  return text.length;
}

function parseTag(text: string, start: number, end: number): HtmlToken {
  const raw = text.slice(start, end);
  if (!raw.startsWith("<") || raw.startsWith("<!--") || raw.startsWith("<!") || raw.startsWith("<?")) return { start, end, tagName: null, attributes: [], isStartTag: false, isEndTag: false };
  let cursor = 1;
  while (/\s/u.test(raw[cursor] ?? "")) cursor += 1;
  const isEndTag = raw[cursor] === "/";
  if (isEndTag) cursor += 1;
  const tagStart = cursor;
  while (/[A-Za-z0-9:-]/u.test(raw[cursor] ?? "")) cursor += 1;
  const tagName = raw.slice(tagStart, cursor).toLowerCase();
  if (tagName.length === 0) return { start, end, tagName: null, attributes: [], isStartTag: false, isEndTag };
  if (isEndTag) return { start, end, tagName, attributes: [], isStartTag: false, isEndTag: true };
  const attributes: HtmlAttribute[] = [];
  while (cursor < raw.length - 1) {
    while (/\s/u.test(raw[cursor] ?? "") || raw[cursor] === "/") cursor += 1;
    if (cursor >= raw.length - 1) break;
    const nameStart = cursor;
    while (!/[\s=>/]/u.test(raw[cursor] ?? "")) cursor += 1;
    if (cursor === nameStart) { cursor += 1; continue; }
    const name = raw.slice(nameStart, cursor).toLowerCase();
    while (/\s/u.test(raw[cursor] ?? "")) cursor += 1;
    if (raw[cursor] !== "=") { attributes.push({ name, value: null, valueStart: null, valueEnd: null, quote: null }); continue; }
    cursor += 1;
    while (/\s/u.test(raw[cursor] ?? "")) cursor += 1;
    const quote = raw[cursor] === "'" || raw[cursor] === '"' ? raw[cursor] as "'" | '"' : null;
    if (quote !== null) cursor += 1;
    const valueStart = cursor;
    if (quote !== null) while (cursor < raw.length - 1 && raw[cursor] !== quote) cursor += 1;
    else while (cursor < raw.length - 1 && !/[\s>]/u.test(raw[cursor] ?? "")) cursor += 1;
    const valueEnd = cursor;
    attributes.push({ name, value: raw.slice(valueStart, valueEnd), valueStart: start + valueStart, valueEnd: start + valueEnd, quote });
    if (quote !== null && raw[cursor] === quote) cursor += 1;
  }
  return { start, end, tagName, attributes, isStartTag: true, isEndTag: false };
}

function tokenizeHtml(text: string): readonly HtmlToken[] {
  const tokens: HtmlToken[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const start = text.indexOf("<", cursor);
    if (start < 0) break;
    if (text.startsWith("<!--", start)) {
      const commentEnd = text.indexOf("-->", start + 4);
      cursor = commentEnd < 0 ? text.length : commentEnd + 3;
      continue;
    }
    const end = findTagEnd(text, start);
    const token = parseTag(text, start, end);
    tokens.push(token);
    cursor = end;
    if (token.isStartTag && (token.tagName === "script" || token.tagName === "style")) {
      const closeNeedle = `</${token.tagName}`;
      const lowerText = text.toLowerCase();
      const closeStart = lowerText.indexOf(closeNeedle, cursor);
      if (closeStart >= 0) cursor = closeStart;
      else cursor = text.length;
    }
  }
  return tokens;
}

function effectiveBaseUrl(documentUrl: string, baseHref: string | null): { url: string; original: string | null; invalid: boolean } {
  if (baseHref === null) return { url: documentUrl, original: null, invalid: false };
  const raw = decodeHtmlEntities(baseHref).trim();
  try { return { url: new URL(raw, documentUrl).href, original: raw, invalid: false }; }
  catch { return { url: documentUrl, original: raw, invalid: true }; }
}

export function resolveRewriteReference(rawReference: string, baseUrl: string): ResolvedReference {
  const raw = assertText(rawReference, "The URL reference");
  const trimmed = decodeHtmlEntities(raw).trim();
  if (trimmed.length === 0 || trimmed.startsWith("#")) return Object.freeze({ raw, trimmed, scheme: null, resolvedUrl: null, normalizedUrl: null, fragment: trimmed.startsWith("#") ? trimmed : "", search: "", isFragmentOnly: trimmed.startsWith("#") });
  const schemeMatch = SCHEME_PATTERN.exec(trimmed);
  const scheme = schemeMatch?.[1]?.toLowerCase() ?? null;
  if (trimmed.includes("\\") || trimmed.startsWith("\\\\")) return Object.freeze({ raw, trimmed, scheme, resolvedUrl: null, normalizedUrl: null, fragment: "", search: "", isFragmentOnly: false });
  if (scheme !== null && !HTTP_SCHEMES.has(`${scheme}:`)) return Object.freeze({ raw, trimmed, scheme, resolvedUrl: trimmed, normalizedUrl: null, fragment: "", search: "", isFragmentOnly: false });
  try {
    const resolved = new URL(trimmed, baseUrl);
    if (!HTTP_SCHEMES.has(resolved.protocol) || resolved.username !== "" || resolved.password !== "") return Object.freeze({ raw, trimmed, scheme, resolvedUrl: resolved.href, normalizedUrl: null, fragment: resolved.hash, search: resolved.search, isFragmentOnly: false });
    return Object.freeze({ raw, trimmed, scheme, resolvedUrl: resolved.href, normalizedUrl: normalizeRewriteUrl(resolved.href), fragment: resolved.hash, search: resolved.search, isFragmentOnly: false });
  } catch {
    return Object.freeze({ raw, trimmed, scheme, resolvedUrl: null, normalizedUrl: null, fragment: "", search: "", isFragmentOnly: false });
  }
}

function classifyHttpDependency(sourcePage: RewritePageInput, resolved: ResolvedReference, kind: RewriteResourceKind): DependencyClassification {
  if (resolved.resolvedUrl === null || resolved.normalizedUrl === null) return "unresolved";
  if (kind === "api" || kind === "json") return "future-network-replay-candidate";
  try {
    const source = new URL(sourcePage.originalUrl);
    const target = new URL(resolved.resolvedUrl);
    return source.origin === target.origin ? "missing-local-resource" : "external-not-archived";
  } catch {
    return "unresolved";
  }
}

function specialSchemeClassification(scheme: string | null): { classification: DependencyClassification; reason: string } {
  if (scheme === "file") return { classification: "blocked-by-policy", reason: "file-scheme-never-enters-the-filesystem-boundary" };
  if (scheme === "blob") return { classification: "future-network-replay-candidate", reason: "blob-identity-is-runtime-scoped-and-no-fake-resource-is-created" };
  if (scheme !== null && SPECIAL_PRESERVED_SCHEMES.has(`${scheme}:`)) return { classification: "preserved-scheme", reason: `${scheme}-reference-preserved-without-fetch-or-execution` };
  return { classification: "unsupported-scheme", reason: "scheme-is-not-an-archived-http-resource" };
}

function localTarget(mapping: ArchivedPageMapping | ArchivedAssetMapping, resolved: ResolvedReference): string {
  const target = isArchivedPageMapping(mapping) ? `${mapping.localRoute}${resolved.search}` : mapping.localReference;
  return `${target}${resolved.fragment}`;
}

interface ProcessReferenceInput {
  readonly rawReference: string;
  readonly sourcePage: RewritePageInput;
  readonly baseUrl: string;
  readonly element: string;
  readonly attribute: string;
  readonly kind: RewriteResourceKind;
  readonly mappings: RewriteMappingIndex;
  readonly dependencyValues: ExternalDependency[];
}

function processReference(input: ProcessReferenceInput): { output: string; observation: RewriteReferenceObservation; rewritten: boolean } {
  const resolved = resolveRewriteReference(input.rawReference, input.baseUrl);
  if (resolved.isFragmentOnly) return { output: input.rawReference, rewritten: false, observation: { sourcePageId: input.sourcePage.pageId, element: input.element, attribute: input.attribute, rawReference: input.rawReference, resolvedUrl: null, normalizedUrl: null, localResource: null, classification: "preserved", alreadyLocal: false } };
  if (resolved.scheme !== null && !HTTP_SCHEMES.has(`${resolved.scheme}:`)) {
    const special = specialSchemeClassification(resolved.scheme);
    input.dependencyValues.push(dependency({ sourcePageId: input.sourcePage.pageId, sourcePageIdentity: input.sourcePage.pageIdentity, projectId: input.sourcePage.projectId, runId: input.sourcePage.runId, projectRevisionId: input.sourcePage.projectRevisionId, rawReference: input.rawReference.slice(0, REWRITE_LIMITS.maximumReferenceLength), resolvedUrl: safeMetadataUrl(resolved.resolvedUrl), normalizedUrl: null, element: input.element, attribute: input.attribute, resourceKind: input.kind, classification: special.classification, policyReason: special.reason }));
    return { output: input.rawReference, rewritten: false, observation: { sourcePageId: input.sourcePage.pageId, element: input.element, attribute: input.attribute, rawReference: input.rawReference, resolvedUrl: resolved.resolvedUrl, normalizedUrl: null, localResource: null, classification: special.classification, alreadyLocal: false } };
  }
  const mapped = resolved.normalizedUrl === null ? null : input.mappings.lookup(resolved.normalizedUrl);
  if (mapped !== null) {
    return { output: localTarget(mapped.mapping, resolved), rewritten: true, observation: { sourcePageId: input.sourcePage.pageId, element: input.element, attribute: input.attribute, rawReference: input.rawReference, resolvedUrl: safeMetadataUrl(resolved.resolvedUrl), normalizedUrl: safeMetadataUrl(resolved.normalizedUrl), localResource: mapped.mapping.localResource, classification: "local-match", alreadyLocal: false } };
  }
  if (input.mappings.hasLocalReference(resolved.trimmed)) {
    return { output: input.rawReference, rewritten: false, observation: { sourcePageId: input.sourcePage.pageId, element: input.element, attribute: input.attribute, rawReference: input.rawReference, resolvedUrl: safeMetadataUrl(resolved.resolvedUrl), normalizedUrl: safeMetadataUrl(resolved.normalizedUrl), localResource: null, classification: "local-match", alreadyLocal: true } };
  }
  const classification = resolved.scheme === null || HTTP_SCHEMES.has(`${resolved.scheme}:`) ? classifyHttpDependency(input.sourcePage, resolved, input.kind) : "unsupported-scheme";
  input.dependencyValues.push(dependency({ sourcePageId: input.sourcePage.pageId, sourcePageIdentity: input.sourcePage.pageIdentity, projectId: input.sourcePage.projectId, runId: input.sourcePage.runId, projectRevisionId: input.sourcePage.projectRevisionId, rawReference: input.rawReference.slice(0, REWRITE_LIMITS.maximumReferenceLength), resolvedUrl: safeMetadataUrl(resolved.resolvedUrl), normalizedUrl: safeMetadataUrl(resolved.normalizedUrl), element: input.element, attribute: input.attribute, resourceKind: input.kind, classification, policyReason: classification === "missing-local-resource" ? "same-origin-reference-has-no-finalized-local-mapping" : classification === "external-not-archived" ? "resolved-origin-has-no-finalized-local-mapping" : "reference-could-not-be-mapped" }));
  const output = resolved.resolvedUrl ?? input.rawReference;
  return { output, rewritten: output !== input.rawReference, observation: { sourcePageId: input.sourcePage.pageId, element: input.element, attribute: input.attribute, rawReference: input.rawReference, resolvedUrl: safeMetadataUrl(resolved.resolvedUrl), normalizedUrl: safeMetadataUrl(resolved.normalizedUrl), localResource: null, classification, alreadyLocal: false } };
}

interface SrcsetCandidate {
  readonly rawUrl: string;
  readonly descriptors: string;
}

export function parseSrcset(value: string): readonly SrcsetCandidate[] {
  const candidates: SrcsetCandidate[] = [];
  let cursor = 0;
  while (cursor < value.length) {
    while (/\s|,/u.test(value[cursor] ?? "")) cursor += 1;
    if (cursor >= value.length) break;
    let rawUrl = "";
    if (value[cursor] === "'" || value[cursor] === '"') {
      const quote = value[cursor];
      cursor += 1;
      const start = cursor;
      while (cursor < value.length && value[cursor] !== quote) cursor += 1;
      rawUrl = value.slice(start, cursor);
      if (value[cursor] === quote) cursor += 1;
    } else {
      const start = cursor;
      while (cursor < value.length && !/\s/u.test(value[cursor] ?? "")) cursor += 1;
      rawUrl = value.slice(start, cursor);
    }
    const descriptorStart = cursor;
    while (cursor < value.length && value[cursor] !== ",") cursor += 1;
    const descriptors = value.slice(descriptorStart, cursor).trim();
    if (rawUrl.length > 0) candidates.push({ rawUrl, descriptors });
    if (value[cursor] === ",") cursor += 1;
  }
  return Object.freeze(candidates);
}

function serializeSrcsetCandidate(value: SrcsetCandidate, outputUrl: string): string {
  return value.descriptors.length === 0 ? outputUrl : `${outputUrl} ${value.descriptors}`;
}

function escapeCssUrl(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll(")", "\\)");
}

function rewriteSrcset(input: ProcessReferenceInput & { readonly value: string }): { output: string; observations: readonly RewriteReferenceObservation[]; rewrittenCount: number } {
  const observations: RewriteReferenceObservation[] = [];
  let rewrittenCount = 0;
  const values = parseSrcset(input.value).map((candidate) => {
    const processed = processReference({ ...input, rawReference: candidate.rawUrl });
    observations.push(processed.observation);
    if (processed.rewritten) rewrittenCount += 1;
    return serializeSrcsetCandidate(candidate, processed.output);
  });
  return { output: values.join(", "), observations: Object.freeze(observations), rewrittenCount };
}

function applyAttributeReplacement(text: string, attribute: HtmlAttribute, value: string): { start: number; end: number; value: string } | null {
  if (attribute.valueStart === null || attribute.valueEnd === null || attribute.value === null) return null;
  return { start: attribute.valueStart, end: attribute.valueEnd, value: escapeAttributeValue(value) };
}

function baseFromTokens(documentUrl: string, tokens: readonly HtmlToken[], text: string): { token: HtmlToken | null; href: string | null; base: { url: string; original: string | null; invalid: boolean } } {
  for (const token of tokens) {
    if (!token.isStartTag || token.tagName !== "base") continue;
    const href = findAttribute(token.attributes, "href");
    if (href?.value !== null && href?.value !== undefined) {
      const base = effectiveBaseUrl(documentUrl, href.value);
      return { token, href: decodeHtmlEntities(href.value), base };
    }
    return { token, href: null, base: { url: documentUrl, original: null, invalid: false } };
  }
  return { token: null, href: null, base: { url: documentUrl, original: null, invalid: false } };
}

export function rewriteHtml(input: HtmlRewriteInput): HtmlRewriteResult {
  const htmlBytes = new TextEncoder().encode(input.html).byteLength;
  if (htmlBytes > REWRITE_LIMITS.maximumHtmlBytes) throw new RewriteOperationError("REWRITE_HTML_TOO_LARGE", "The HTML document exceeds the rewrite bound");
  const documentUrl = assertHttpUrl(input.documentUrl, "The document URL");
  const sourcePage: RewritePageInput = Object.freeze({ ...input.page, originalUrl: assertHttpUrl(input.page.originalUrl, "The source Page URL"), normalizedUrl: assertHttpUrl(input.page.normalizedUrl, "The source normalized Page URL"), localResource: canonicalResourcePath(input.page.localResource) });
  const tokens = tokenizeHtml(input.html);
  const baseInfo = baseFromTokens(documentUrl, tokens, input.html);
  const dependencies: ExternalDependency[] = [];
  if (baseInfo.base.invalid && baseInfo.href !== null) dependencies.push(dependency({ sourcePageId: sourcePage.pageId, sourcePageIdentity: sourcePage.pageIdentity, projectId: sourcePage.projectId, runId: sourcePage.runId, projectRevisionId: sourcePage.projectRevisionId, rawReference: baseInfo.href, resolvedUrl: safeMetadataUrl(baseInfo.href), normalizedUrl: null, element: "base", attribute: "href", resourceKind: "other", classification: "unresolved", policyReason: "base-url-could-not-be-resolved-and-was-removed" }));
  const observations: RewriteReferenceObservation[] = [];
  const canonicalReferences: CanonicalReferenceObservation[] = [];
  const replacements: { start: number; end: number; value: string }[] = [];
  let rewrittenReferenceCount = 0;
  let removedBaseElement = false;
  for (const token of tokens) {
    if (token.tagName === null || token.isEndTag || !token.isStartTag) continue;
    if (token.tagName === "base" && token.start === baseInfo.token?.start) {
      replacements.push({ start: token.start, end: token.end, value: "" });
      removedBaseElement = true;
      continue;
    }
    const canonical = isCanonicalLink(token.tagName, token.attributes);
    const rules = URL_ATTRIBUTE_RULES[token.tagName] ?? {};
    for (const attribute of token.attributes) {
      if (attribute.value === null || attribute.valueStart === null || attribute.valueEnd === null) continue;
      const attributeName = attribute.name;
      if (canonical && attributeName === "href") {
        const resolved = resolveRewriteReference(attribute.value, baseInfo.base.url);
        canonicalReferences.push({ rawReference: attribute.value, resolvedUrl: safeMetadataUrl(resolved.resolvedUrl), normalizedUrl: safeMetadataUrl(resolved.normalizedUrl), originalPreserved: true });
        if (resolved.resolvedUrl !== null && !resolved.isFragmentOnly && (resolved.scheme === null || HTTP_SCHEMES.has(`${resolved.scheme}:`))) replacements.push(applyAttributeReplacement(input.html, attribute, resolved.resolvedUrl)!);
        continue;
      }
      const kind = rules[attributeName] ?? resourceKindForTag(token.tagName, attributeName);
      if (kind === null || kind === undefined) continue;
      if (attributeName === "srcset") {
        const rewritten = rewriteSrcset({ rawReference: attribute.value, sourcePage, baseUrl: baseInfo.base.url, element: token.tagName, attribute: attributeName, kind, mappings: input.mappings, dependencyValues: dependencies, value: decodeHtmlEntities(attribute.value) });
        observations.push(...rewritten.observations);
        rewrittenReferenceCount += rewritten.rewrittenCount;
        replacements.push(applyAttributeReplacement(input.html, attribute, rewritten.output)!);
      } else {
        const processed = processReference({ rawReference: attribute.value, sourcePage, baseUrl: baseInfo.base.url, element: token.tagName, attribute: attributeName, kind, mappings: input.mappings, dependencyValues: dependencies });
        observations.push(processed.observation);
        if (processed.rewritten) { rewrittenReferenceCount += 1; replacements.push(applyAttributeReplacement(input.html, attribute, processed.output)!); }
      }
    }
  }
  let output = input.html;
  for (const replacement of replacements.sort((left, right) => right.start - left.start)) output = `${output.slice(0, replacement.start)}${replacement.value}${output.slice(replacement.end)}`;
  return Object.freeze({ contractVersion: HTML_REWRITE_CONTRACT_VERSION, html: output, page: sourcePage, effectiveBaseUrl: baseInfo.base.url, originalBaseUrl: baseInfo.href, removedBaseElement, references: Object.freeze(observations), canonicalReferences: Object.freeze(canonicalReferences), dependencies: dependencyMap(sourcePage, dependencies), originalResourceMap: input.mappings.originalResourceMap(), rewrittenReferenceCount });
}

function scanCssReplacement(css: string, start: number): { end: number; valueStart: number; valueEnd: number } | null {
  let cursor = start;
  while (/\s/u.test(css[cursor] ?? "")) cursor += 1;
  if (css[cursor] === "'" || css[cursor] === '"') {
    const quote = css[cursor];
    cursor += 1;
    const valueStart = cursor;
    while (cursor < css.length && css[cursor] !== quote) cursor += 1;
    if (css[cursor] !== quote) return null;
    return { end: cursor + 1, valueStart, valueEnd: cursor };
  }
  const valueStart = cursor;
  while (cursor < css.length && css[cursor] !== ")" && !/\s/u.test(css[cursor] ?? "")) cursor += 1;
  return { end: cursor, valueStart, valueEnd: cursor };
}

export function rewriteCss(input: CssRewriteInput): CssRewriteResult {
  if (new TextEncoder().encode(input.css).byteLength > REWRITE_LIMITS.maximumCssBytes) throw new RewriteOperationError("REWRITE_CSS_TOO_LARGE", "The CSS resource exceeds the rewrite bound");
  const cssUrl = assertHttpUrl(input.cssUrl, "The CSS URL");
  const sourcePage: RewritePageInput = Object.freeze({ ...input.sourcePage, originalUrl: assertHttpUrl(input.sourcePage.originalUrl, "The source Page URL"), normalizedUrl: assertHttpUrl(input.sourcePage.normalizedUrl, "The source normalized Page URL"), localResource: canonicalResourcePath(input.sourcePage.localResource) });
  const dependencies: ExternalDependency[] = [];
  const observations: RewriteReferenceObservation[] = [];
  const replacements: { start: number; end: number; value: string }[] = [];
  let rewrittenReferenceCount = 0;
  let cursor = 0;
  let quote: string | null = null;
  while (cursor < input.css.length) {
    if (input.css.startsWith("/*", cursor)) {
      const end = input.css.indexOf("*/", cursor + 2);
      cursor = end < 0 ? input.css.length : end + 2;
      continue;
    }
    if (quote !== null) {
      if (input.css[cursor] === "\\") cursor += 2;
      else { if (input.css[cursor] === quote) quote = null; cursor += 1; }
      continue;
    }
    if (input.css[cursor] === "'" || input.css[cursor] === '"') { quote = input.css[cursor] ?? null; cursor += 1; continue; }
    const lower = input.css.slice(cursor).toLowerCase();
    if (lower.startsWith("url") && !/[A-Za-z0-9_-]/u.test(input.css[cursor - 1] ?? "")) {
      let open = cursor + 3;
      while (/\s/u.test(input.css[open] ?? "")) open += 1;
      if (input.css[open] !== "(") { cursor += 3; continue; }
      const parsed = scanCssReplacement(input.css, open + 1);
      if (parsed === null) { cursor = open + 1; continue; }
      const rawReference = input.css.slice(parsed.valueStart, parsed.valueEnd);
      const processed = processReference({ rawReference, sourcePage, baseUrl: cssUrl, element: "css", attribute: "url", kind: "asset", mappings: input.mappings, dependencyValues: dependencies });
      observations.push(processed.observation);
      if (processed.rewritten) rewrittenReferenceCount += 1;
      replacements.push({ start: parsed.valueStart, end: parsed.valueEnd, value: escapeCssUrl(processed.output) });
      cursor = Math.max(parsed.end, open + 1);
      continue;
    }
    if (lower.startsWith("@import") && !/[A-Za-z0-9_-]/u.test(input.css[cursor - 1] ?? "")) {
      let importCursor = cursor + 7;
      while (/\s/u.test(input.css[importCursor] ?? "")) importCursor += 1;
      const parsed = scanCssReplacement(input.css, importCursor);
      if (parsed !== null && input.css[importCursor] !== "u" && input.css[importCursor] !== "U") {
        const rawReference = input.css.slice(parsed.valueStart, parsed.valueEnd);
        const processed = processReference({ rawReference, sourcePage, baseUrl: cssUrl, element: "css", attribute: "@import", kind: "css", mappings: input.mappings, dependencyValues: dependencies });
        observations.push(processed.observation);
        if (processed.rewritten) rewrittenReferenceCount += 1;
        replacements.push({ start: parsed.valueStart, end: parsed.valueEnd, value: escapeCssUrl(processed.output) });
        cursor = parsed.end;
        continue;
      }
    }
    cursor += 1;
  }
  let output = input.css;
  for (const replacement of replacements.sort((left, right) => right.start - left.start)) output = `${output.slice(0, replacement.start)}${replacement.value}${output.slice(replacement.end)}`;
  return Object.freeze({ contractVersion: HTML_REWRITE_CONTRACT_VERSION, css: output, cssUrl, references: Object.freeze(observations), dependencies: dependencyMap(sourcePage, dependencies), rewrittenReferenceCount });
}

export function routeMapWithCollisionStates(value: RouteMap): RouteMap {
  return value;
}

export function canonicalRouteCollisionKey(value: string): string {
  return routeCollisionKey(canonicalLocalRoute(value));
}

export function canonicalRewriteResourcePath(value: string): string {
  return canonicalResourcePath(value);
}

export function canonicalRewriteLocalReference(value: string): string {
  return canonicalLocalReference(value);
}

export function canonicalRewritePathCollisionKey(value: string): string {
  return canonicalPathCollisionKey(canonicalResourcePath(value));
}
