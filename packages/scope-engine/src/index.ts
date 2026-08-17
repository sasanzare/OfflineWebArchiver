import { createHash } from "node:crypto";
import { domainToASCII } from "node:url";
import { getDomain } from "tldts";
import { z } from "zod";
import {
  SERVICE_WORKER_POLICY_MODES,
  SERVICE_WORKER_POLICY_VERSION,
  normalizeServiceWorkerPolicy,
  parseLoginFlow,
  type LoginFlow,
} from "@offline-web-archive/archive-core";

export const SCOPE_ENGINE_VERSION = 1 as const;
export const SITE_PROFILE_SCHEMA_VERSION = 1 as const;
export const SCOPE_LIMITS = Object.freeze({
  urlLength: 8_192,
  seeds: 100,
  domainRules: 200,
  pathRules: 500,
  queryRules: 500,
  batch: 500,
});

const timestamp = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/).refine((value) => !Number.isNaN(Date.parse(value)));
const nullableTimestamp = timestamp.nullable();
const ruleId = z.string().min(1).max(80).regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const hostname = z.string().min(1).max(253).regex(/^[a-z0-9.:-]+$/);
const scheme = z.enum(["http", "https"]);
const domainRule = z.object({
  ruleId,
  effect: z.enum(["allow", "deny"]),
  match: z.enum(["exact", "subdomains"]),
  hostname,
  schemes: z.array(scheme).min(1).max(2),
  ports: z.array(z.number().int().min(1).max(65_535)).max(20),
}).strict();
const pathRule = z.object({
  ruleId,
  effect: z.enum(["allow", "deny"]),
  match: z.enum(["exact", "prefix"]),
  path: z.string().min(1).max(2_048).startsWith("/"),
}).strict();
const queryRule = z.object({
  key: z.string().min(1).max(128),
  classification: z.enum(["identity", "functional", "tracking", "ignored", "denied"]),
  sensitive: z.boolean(),
}).strict();
const authorization = z.object({
  status: z.enum(["incomplete", "approved"]),
  legalBasisReference: z.string().min(1).max(256).refine((value) => !/^[A-Za-z]:[\\/]/.test(value) && !value.startsWith("/") && !value.startsWith("\\") && !/[\u0000-\u001f]/.test(value), "Authorization reference cannot be a host path or contain controls").nullable(),
  approvedBy: z.array(z.string().min(1).max(120)).max(20),
  approvedAt: nullableTimestamp,
  expiresAt: nullableTimestamp,
}).strict();
const policyFields = {
  name: z.string().trim().min(1).max(120),
  baseUrl: z.string().min(1).max(SCOPE_LIMITS.urlLength),
  seedUrls: z.array(z.string().min(1).max(SCOPE_LIMITS.urlLength)).min(1).max(SCOPE_LIMITS.seeds),
  authorization,
  domainRules: z.array(domainRule).min(1).max(SCOPE_LIMITS.domainRules),
  pathRules: z.array(pathRule).max(SCOPE_LIMITS.pathRules),
  queryPolicy: z.object({
    unknown: z.enum(["identity", "ignored", "denied"]),
    rules: z.array(queryRule).max(SCOPE_LIMITS.queryRules),
  }).strict(),
  fragmentPolicy: z.enum(["ignore-all", "preserve-all", "preserve-hash-routes"]),
  redirectPolicy: z.object({
    allowApprovedExternal: z.boolean(),
    allowHttpsDowngrade: z.boolean(),
  }).strict(),
  canonicalPolicy: z.object({ external: z.enum(["ignore", "reject"]) }).strict(),
  networkPolicy: z.object({
    allowedIpClasses: z.array(z.enum(["public", "loopback", "private", "link-local", "multicast", "reserved", "unspecified"])).max(7),
  }).strict(),
  serviceWorkerPolicy: z.object({
    version: z.literal(SERVICE_WORKER_POLICY_VERSION),
    mode: z.enum(SERVICE_WORKER_POLICY_MODES),
    profileMode: z.enum(["block", "allow"]).optional(),
  }).strict().superRefine((value, context) => {
    if (value.mode === "profile-specific" && value.profileMode === undefined) context.addIssue({ code: "custom", message: "Profile-specific Service Worker policy requires profileMode" });
  }).default({ version: SERVICE_WORKER_POLICY_VERSION, mode: "block" }),
  loginFlow: z.custom<LoginFlow>((value) => {
    try {
      parseLoginFlow(value);
      return true;
    } catch {
      return false;
    }
  }).nullable().optional(),
  limits: z.object({
    maxDepth: z.number().int().nonnegative().max(1_000).nullable(),
    maxPages: z.number().int().nonnegative().max(10_000_000).nullable(),
    maxRedirects: z.number().int().nonnegative().max(20),
    maxBatchSize: z.number().int().positive().max(SCOPE_LIMITS.batch),
  }).strict(),
};

export const SiteProfileDraftSchema = z.object(policyFields).strict();
export const SiteProfileSchema = z.object({
  schemaVersion: z.literal(SITE_PROFILE_SCHEMA_VERSION),
  engineVersion: z.literal(SCOPE_ENGINE_VERSION),
  profileId: z.string().uuid(),
  projectId: z.string().uuid(),
  revisionId: z.string().uuid(),
  sequence: z.number().int().positive(),
  createdAt: timestamp,
  updatedAt: timestamp,
  ...policyFields,
}).strict();

export type SiteProfileDraft = z.infer<typeof SiteProfileDraftSchema>;
export type SiteProfile = z.infer<typeof SiteProfileSchema>;
export type IpAddressClass = "public" | "loopback" | "private" | "link-local" | "multicast" | "reserved" | "unspecified" | "invalid" | "unknown-hostname";
export type SiteRelation = "same-origin" | "same-host" | "same-registrable-domain" | "external" | "unknown";
export type ScopeDiscoveryType = "seed" | "dom-link" | "canonical" | "redirect" | "sitemap" | "history-api" | "navigation-action" | "json-discovery" | "manual";
export type ScopeReasonCode =
  | "URL_ACCEPTED" | "URL_INVALID" | "URL_TOO_LONG" | "URL_CONTROL_CHARACTER" | "URL_BACKSLASH_CONFUSION"
  | "URL_INVALID_PERCENT_ENCODING" | "URL_CREDENTIALS_FORBIDDEN" | "SCHEME_NOT_ALLOWED" | "DOMAIN_DENIED"
  | "DOMAIN_NOT_ALLOWED" | "PATH_DENIED" | "PATH_NOT_ALLOWED" | "QUERY_DENIED" | "SENSITIVE_QUERY_REMOVED"
  | "DEPTH_LIMIT_REACHED" | "PAGE_LIMIT_REACHED" | "KNOWN_IDENTITY" | "PRIVATE_NETWORK_NOT_ALLOWED"
  | "PROFILE_AUTHORIZATION_INCOMPLETE" | "PROFILE_REVISION_MISMATCH" | "SENSITIVE_FRAGMENT_REMOVED" | "DEPTH_INVALID" | "PAGE_COUNT_INVALID";

export interface ScopeEvaluationInput {
  rawUrl?: string | undefined;
  url?: string | undefined;
  sourceUrl?: string | undefined;
  baseUrl?: string | undefined;
  sourceDepth?: number | undefined;
  depth?: number | undefined;
  discoveryType?: ScopeDiscoveryType | undefined;
  profileRevision?: string | undefined;
  currentEligibleCount?: number | undefined;
  knownIdentityHashes?: readonly string[] | undefined;
}

export interface ScopeDecision {
  decisionId: string;
  engineVersion: typeof SCOPE_ENGINE_VERSION;
  profileId: string;
  profileRevisionId: string;
  eligible: boolean;
  shouldQueue: boolean;
  reasonCodes: readonly ScopeReasonCode[];
  normalizedUrl: string | null;
  identityUrl: string | null;
  identityHash: string | null;
  displayUrl: string | null;
  matchedRuleIds: readonly string[];
  matchedRules: readonly {
    ruleId: string;
    ruleType: "domain" | "path" | "query";
    ruleAction: "allow" | "deny" | "identity" | "functional" | "tracking" | "ignored" | "denied";
    ruleMatch: "exact" | "subdomains" | "prefix" | "key";
  }[];
  depth: number;
  security: {
    hostClass: IpAddressClass;
    networkAuthorized: boolean;
    networkPreflightRequired: boolean;
  };
  relation: SiteRelation;
  query: { identityKeys: readonly string[]; omittedKeys: readonly string[]; deniedKeys: readonly string[] };
}

export interface CanonicalDecision {
  classification: "accepted-same-identity" | "accepted-new-identity" | "alias" | "ignored-external" | "rejected-out-of-scope" | "rejected-invalid" | "conflict";
  reasonCodes: readonly string[];
  sourceIdentityHash: string | null;
  canonicalIdentityHash: string | null;
}

export interface RedirectDecision {
  classification: "follow-in-scope" | "follow-approved-external" | "stop-external" | "stop-denied" | "stop-invalid" | "stop-loop" | "stop-max-redirects";
  reasonCodes: readonly string[];
  target: ScopeDecision;
}

export interface SiteProfileValidation {
  valid: boolean;
  errors: readonly { code: string; path: string; message: string }[];
  warnings: readonly { code: string; path: string; message: string }[];
}

export interface SiteProfileComparison {
  fromRevisionId: string;
  toRevisionId: string;
  changedPaths: readonly string[];
}

export interface SiteProfileUpdate {
  profile: SiteProfile;
  changedPaths: readonly string[];
}

export interface ProfileStoragePort {
  createProfile(input: { projectPath: string; draft: SiteProfileDraft }): Promise<SiteProfile>;
  getProfile(projectPath: string): Promise<SiteProfile>;
  updateProfile(input: { projectPath: string; expectedRevisionId: string; draft: SiteProfileDraft }): Promise<SiteProfileUpdate>;
  validateStoredProfile(projectPath: string): Promise<SiteProfileValidation>;
  compareProfiles(input: { projectPath: string; fromSequence: number; toSequence: number }): Promise<SiteProfileComparison>;
}

export class ScopeEngineError extends Error {
  public constructor(
    public readonly code: "PROFILE_INVALID" | "PROFILE_NOT_FOUND" | "PROFILE_ALREADY_EXISTS" | "PROFILE_REVISION_CONFLICT" | "PROFILE_NO_CHANGES" | "PROFILE_INTEGRITY_MISMATCH" | "SCOPE_BATCH_LIMIT_EXCEEDED",
    message: string,
  ) {
    super(message);
    this.name = "ScopeEngineError";
  }
}

const DEFAULT_TRACKING_KEYS = ["fbclid", "gclid", "mc_cid", "mc_eid", "utm_campaign", "utm_content", "utm_medium", "utm_source", "utm_term"];
const DEFAULT_SENSITIVE_KEYS = ["access_token", "api_key", "apikey", "auth", "code", "password", "secret", "session", "token"];

function canonicalHostname(value: string): string {
  const withoutBrackets = value.startsWith("[") && value.endsWith("]") ? value.slice(1, -1) : value;
  if (withoutBrackets.includes(":")) {
    if (ipv6Words(withoutBrackets) === null) throw new ScopeEngineError("PROFILE_INVALID", "A domain rule contains an invalid IPv6 address");
    return withoutBrackets.toLowerCase();
  }
  const ascii = domainToASCII(withoutBrackets.replace(/\.$/, "")).toLowerCase();
  if (ascii.length === 0) throw new ScopeEngineError("PROFILE_INVALID", "A domain rule contains an invalid hostname");
  return ascii;
}

function canonicalPathRule(value: string): string {
  if (/[?#\\\u0000-\u001f]/.test(value)) throw new ScopeEngineError("PROFILE_INVALID", "Path rules must contain only a URL pathname");
  const parsed = new URL(value, "https://example.invalid");
  return uppercaseEscapes(parsed.pathname);
}

function uniqueIds(values: readonly { ruleId: string }[], label: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value.ruleId)) throw new ScopeEngineError("PROFILE_INVALID", `Duplicate ${label} rule ID ${value.ruleId}`);
    seen.add(value.ruleId);
  }
}

function ordinalCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function normalizeSiteProfileDraft(value: unknown): SiteProfileDraft {
  const initial = SiteProfileDraftSchema.safeParse(value);
  if (!initial.success) throw new ScopeEngineError("PROFILE_INVALID", initial.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "));
  const normalized = {
    ...initial.data,
    name: initial.data.name.trim(),
    baseUrl: normalizeBaseUrl(initial.data.baseUrl),
    seedUrls: [...new Set(initial.data.seedUrls.map((seed) => normalizeSeed(seed)))].sort(),
    authorization: {
      ...initial.data.authorization,
      approvedBy: [...new Set(initial.data.authorization.approvedBy.map((item) => item.trim()))].sort(),
    },
    domainRules: initial.data.domainRules.map((item) => ({
      ...item,
      hostname: canonicalHostname(item.hostname),
      schemes: [...new Set(item.schemes)].sort(),
      ports: [...new Set(item.ports)].sort((a, b) => a - b),
    })).sort((a, b) => ordinalCompare(a.ruleId, b.ruleId)),
    pathRules: initial.data.pathRules.map((item) => ({ ...item, path: canonicalPathRule(item.path) })).sort((a, b) => ordinalCompare(a.ruleId, b.ruleId)),
    queryPolicy: {
      unknown: initial.data.queryPolicy.unknown,
      rules: initial.data.queryPolicy.rules.map((item) => ({ ...item, key: item.key.toLowerCase() })).sort((a, b) => ordinalCompare(a.key, b.key)),
    },
    networkPolicy: { allowedIpClasses: [...new Set(initial.data.networkPolicy.allowedIpClasses)].sort() },
    serviceWorkerPolicy: normalizeServiceWorkerPolicy(initial.data["serviceWorkerPolicy"] === undefined ? undefined : {
      version: initial.data["serviceWorkerPolicy"].version,
      mode: initial.data["serviceWorkerPolicy"].mode,
      ...(initial.data["serviceWorkerPolicy"].profileMode === undefined ? {} : { profileMode: initial.data["serviceWorkerPolicy"].profileMode }),
    }),
  } satisfies SiteProfileDraft;
  if (initial.data.loginFlow !== undefined && initial.data.loginFlow !== null) {
    (normalized as SiteProfileDraft & { loginFlow?: LoginFlow | null }).loginFlow = parseLoginFlow(initial.data.loginFlow);
  }
  uniqueIds(normalized.domainRules, "domain");
  uniqueIds(normalized.pathRules, "path");
  const queryKeys = new Set<string>();
  for (const item of normalized.queryPolicy.rules) {
    if (queryKeys.has(item.key)) throw new ScopeEngineError("PROFILE_INVALID", `Duplicate query classification for ${item.key}`);
    queryKeys.add(item.key);
  }
  const conflicts = new Set<string>();
  for (const item of normalized.domainRules) {
    const key = `${item.match}:${item.hostname}:${item.schemes.join(",")}:${item.ports.join(",")}`;
    if (conflicts.has(`${key}:${item.effect}`)) throw new ScopeEngineError("PROFILE_INVALID", `Duplicate equivalent domain rule ${item.ruleId}`);
    if (conflicts.has(`${key}:${item.effect === "allow" ? "deny" : "allow"}`)) throw new ScopeEngineError("PROFILE_INVALID", `Conflicting domain rule ${item.ruleId}`);
    conflicts.add(`${key}:${item.effect}`);
  }
  const pathConflicts = new Set<string>();
  for (const item of normalized.pathRules) {
    const comparablePath = item.match === "prefix" && item.path !== "/" && item.path.endsWith("/") ? item.path.slice(0, -1) : item.path;
    const key = `${item.match}:${comparablePath}`;
    if (pathConflicts.has(`${key}:${item.effect}`)) throw new ScopeEngineError("PROFILE_INVALID", `Duplicate equivalent path rule ${item.ruleId}`);
    if (pathConflicts.has(`${key}:${item.effect === "allow" ? "deny" : "allow"}`)) throw new ScopeEngineError("PROFILE_INVALID", `Conflicting path rule ${item.ruleId}`);
    pathConflicts.add(`${key}:${item.effect}`);
  }
  if (normalized.authorization.status === "approved" && (normalized.authorization.legalBasisReference === null || normalized.authorization.approvedBy.length === 0 || normalized.authorization.approvedAt === null)) {
    throw new ScopeEngineError("PROFILE_INVALID", "Approved authorization requires a reference, approver, and approval time");
  }
  if (normalized.authorization.approvedAt !== null && normalized.authorization.expiresAt !== null && Date.parse(normalized.authorization.expiresAt) <= Date.parse(normalized.authorization.approvedAt)) {
    throw new ScopeEngineError("PROFILE_INVALID", "Authorization expiry must be later than approval time");
  }
  for (const [label, candidateValue] of [["Base URL", normalized.baseUrl], ...normalized.seedUrls.map((seed) => ["Seed URL", seed])] as const) {
    const candidate = new URL(candidateValue);
    const host = canonicalHostname(candidate.hostname);
    const deniedDomain = normalized.domainRules.some((rule) => rule.effect === "deny" && domainMatches(host, rule, candidate));
    const allowedDomain = normalized.domainRules.some((rule) => rule.effect === "allow" && domainMatches(host, rule, candidate));
    const deniedPath = normalized.pathRules.some((rule) => rule.effect === "deny" && pathMatches(candidate.pathname, rule));
    const pathAllows = normalized.pathRules.filter((rule) => rule.effect === "allow");
    if (deniedDomain || !allowedDomain || deniedPath || (pathAllows.length > 0 && !pathAllows.some((rule) => pathMatches(candidate.pathname, rule)))) {
      throw new ScopeEngineError("PROFILE_INVALID", `${label} is outside the configured scope: ${candidate.origin}`);
    }
  }
  return SiteProfileDraftSchema.parse(normalized);
}

export function parseSiteProfile(value: unknown): SiteProfile {
  const parsed = SiteProfileSchema.safeParse(value);
  if (!parsed.success) throw new ScopeEngineError("PROFILE_INVALID", parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "));
  const { schemaVersion: _schemaVersion, engineVersion: _engineVersion, profileId: _profileId, projectId: _projectId, revisionId: _revisionId, sequence: _sequence, createdAt: _createdAt, updatedAt: _updatedAt, ...draft } = parsed.data;
  const normalizedDraft = normalizeSiteProfileDraft(draft);
  return SiteProfileSchema.parse({ ...parsed.data, ...normalizedDraft });
}

export function serializeSiteProfile(profile: SiteProfile): string {
  return `${JSON.stringify(parseSiteProfile(profile), null, 2)}\n`;
}

export function validateSiteProfile(value: unknown): SiteProfileValidation {
  try {
    const profile = parseSiteProfile(value);
    const warnings = profile.authorization.status === "incomplete"
      ? [{ code: "PROFILE_AUTHORIZATION_INCOMPLETE", path: "authorization", message: "Preview is available, but the profile cannot authorize future requests." }]
      : [];
    return { valid: true, errors: [], warnings };
  } catch (error) {
    return { valid: false, errors: [{ code: error instanceof ScopeEngineError ? error.code : "PROFILE_INVALID", path: "profile", message: error instanceof Error ? error.message : "Invalid profile" }], warnings: [] };
  }
}

export function createDefaultSiteProfileDraft(input: { name: string; seedUrl: string }): SiteProfileDraft {
  const seed = new URL(normalizeSeed(input.seedUrl));
  return normalizeSiteProfileDraft({
    name: input.name,
    baseUrl: seed.href,
    seedUrls: [seed.href],
    authorization: { status: "incomplete", legalBasisReference: null, approvedBy: [], approvedAt: null, expiresAt: null },
    domainRules: [{ ruleId: "seed-host", effect: "allow", match: "exact", hostname: seed.hostname, schemes: [seed.protocol.slice(0, -1)], ports: seed.port === "" ? [] : [Number(seed.port)] }],
    pathRules: [],
    queryPolicy: {
      unknown: "identity",
      rules: [
        ...DEFAULT_TRACKING_KEYS.map((key) => ({ key, classification: "tracking", sensitive: false })),
        ...DEFAULT_SENSITIVE_KEYS.map((key) => ({ key, classification: "ignored", sensitive: true })),
      ],
    },
    fragmentPolicy: "ignore-all",
    redirectPolicy: { allowApprovedExternal: false, allowHttpsDowngrade: false },
    canonicalPolicy: { external: "ignore" },
    networkPolicy: { allowedIpClasses: ["public"] },
    limits: { maxDepth: 10, maxPages: 100_000, maxRedirects: 10, maxBatchSize: 100 },
  });
}

function normalizeSeed(value: string): string {
  const checked = validateRawUrl(value);
  if (checked !== null) throw new ScopeEngineError("PROFILE_INVALID", `Invalid seed URL: ${checked}`);
  const url = new URL(value);
  if (!isHttp(url) || url.username !== "" || url.password !== "") throw new ScopeEngineError("PROFILE_INVALID", "Seed URLs must be credential-free HTTP(S) URLs");
  const host = canonicalHostname(url.hostname);
  url.hostname = host.includes(":") ? `[${host}]` : host;
  url.hash = "";
  return url.href;
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(normalizeSeed(value));
  url.search = "";
  url.hash = "";
  return url.href;
}

function validateRawUrl(value: string): ScopeReasonCode | null {
  if (value.length > SCOPE_LIMITS.urlLength) return "URL_TOO_LONG";
  if (/[\u0000-\u001f\u007f]/.test(value)) return "URL_CONTROL_CHARACTER";
  if (value.includes("\\")) return "URL_BACKSLASH_CONFUSION";
  if (/%(?![0-9a-f]{2})/i.test(value)) return "URL_INVALID_PERCENT_ENCODING";
  return null;
}

function isHttp(url: URL): boolean {
  return url.protocol === "http:" || url.protocol === "https:";
}

function uppercaseEscapes(value: string): string {
  return value.replace(/%[0-9a-f]{2}/gi, (item) => item.toUpperCase());
}

function ipv4Bytes(host: string): number[] | null {
  const parts = host.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return null;
  const bytes = parts.map(Number);
  return bytes.every((value) => value >= 0 && value <= 255) ? bytes : null;
}

function ipv6Words(host: string): number[] | null {
  const raw = host.toLowerCase().split("%")[0]!;
  if (!raw.includes(":")) return null;
  const halves = raw.split("::");
  if (halves.length > 2) return null;
  const parseSide = (side: string): number[] | null => {
    if (side === "") return [];
    const result: number[] = [];
    for (const part of side.split(":")) {
      const v4 = ipv4Bytes(part);
      if (v4 !== null) result.push((v4[0]! << 8) | v4[1]!, (v4[2]! << 8) | v4[3]!);
      else if (/^[0-9a-f]{1,4}$/.test(part)) result.push(Number.parseInt(part, 16));
      else return null;
    }
    return result;
  };
  const left = parseSide(halves[0]!);
  const right = parseSide(halves[1] ?? "");
  if (left === null || right === null) return null;
  if (halves.length === 1) return left.length === 8 ? left : null;
  const zeros = 8 - left.length - right.length;
  return zeros >= 1 ? [...left, ...Array<number>(zeros).fill(0), ...right] : null;
}

export function classifyHost(hostnameValue: string): IpAddressClass {
  const host = hostnameValue.replace(/^\[|\]$/g, "").toLowerCase();
  const v4 = ipv4Bytes(host);
  if (v4 !== null) {
    const [a, b, c] = v4;
    if (a === 0) return "unspecified";
    if (a === 127) return "loopback";
    if (a === 10 || (a === 172 && b! >= 16 && b! <= 31) || (a === 192 && b === 168)) return "private";
    if (a === 169 && b === 254) return "link-local";
    if (a! >= 224 && a! <= 239) return "multicast";
    if (a! >= 240 || (a === 192 && b === 0 && c === 2) || (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113)) return "reserved";
    return "public";
  }
  const v6 = ipv6Words(host);
  if (v6 !== null) {
    if (v6.every((word) => word === 0)) return "unspecified";
    if (v6.slice(0, 7).every((word) => word === 0) && v6[7] === 1) return "loopback";
    if ((v6[0]! & 0xfe00) === 0xfc00) return "private";
    if ((v6[0]! & 0xffc0) === 0xfe80) return "link-local";
    if ((v6[0]! & 0xff00) === 0xff00) return "multicast";
    if (v6[0] === 0x2001 && v6[1] === 0x0db8) return "reserved";
    if (v6.slice(0, 5).every((word) => word === 0) && v6[5] === 0xffff) {
      return classifyHost(`${v6[6]! >> 8}.${v6[6]! & 255}.${v6[7]! >> 8}.${v6[7]! & 255}`);
    }
    return "public";
  }
  if (host.includes(":")) return "invalid";
  return "unknown-hostname";
}

function domainMatches(host: string, rule: SiteProfile["domainRules"][number], url: URL): boolean {
  const hostMatch = host === rule.hostname || (rule.match === "subdomains" && host.endsWith(`.${rule.hostname}`));
  const schemeMatch = rule.schemes.includes(url.protocol.slice(0, -1) as "http" | "https");
  const port = url.port === "" ? (url.protocol === "https:" ? 443 : 80) : Number(url.port);
  return hostMatch && schemeMatch && (rule.ports.length === 0 || rule.ports.includes(port));
}

function pathMatches(pathname: string, rule: SiteProfile["pathRules"][number]): boolean {
  if (rule.match === "exact") return pathname === rule.path;
  if (rule.path === "/") return true;
  const prefix = rule.path.endsWith("/") ? rule.path.slice(0, -1) : rule.path;
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function relationToSeeds(url: URL, seeds: readonly string[]): SiteRelation {
  let sameHost = false;
  let sameDomain = false;
  const domain = getDomain(url.hostname, { allowPrivateDomains: true, detectSpecialUse: true });
  for (const seed of seeds) {
    const candidate = new URL(seed);
    if (candidate.origin === url.origin) return "same-origin";
    if (candidate.hostname === url.hostname) sameHost = true;
    const candidateDomain = getDomain(candidate.hostname, { allowPrivateDomains: true, detectSpecialUse: true });
    if (domain !== null && candidateDomain === domain) sameDomain = true;
  }
  return sameHost ? "same-host" : sameDomain ? "same-registrable-domain" : "external";
}

function safeFailure(profile: SiteProfile, depth: number, code: ScopeReasonCode): ScopeDecision {
  const basis = `${SCOPE_ENGINE_VERSION}|${profile.profileId}|${profile.revisionId}|${code}|${depth}`;
  return { decisionId: sha256(basis), engineVersion: SCOPE_ENGINE_VERSION, profileId: profile.profileId, profileRevisionId: profile.revisionId, eligible: false, shouldQueue: false, reasonCodes: [code], normalizedUrl: null, identityUrl: null, identityHash: null, displayUrl: null, matchedRuleIds: [], matchedRules: [], depth, security: { hostClass: "invalid", networkAuthorized: false, networkPreflightRequired: true }, relation: "unknown", query: { identityKeys: [], omittedKeys: [], deniedKeys: [] } };
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function evaluateScope(profileValue: SiteProfile, input: ScopeEvaluationInput): ScopeDecision {
  const profile = parseSiteProfile(profileValue);
  const requestedDepth = input.sourceDepth ?? input.depth ?? 0;
  const depth = Number.isSafeInteger(requestedDepth) && requestedDepth >= 0 && requestedDepth <= 1_001 ? requestedDepth : 0;
  if (depth !== requestedDepth) return safeFailure(profile, depth, "DEPTH_INVALID");
  if (input.currentEligibleCount !== undefined && (!Number.isSafeInteger(input.currentEligibleCount) || input.currentEligibleCount < 0 || input.currentEligibleCount > 10_000_000)) return safeFailure(profile, depth, "PAGE_COUNT_INVALID");
  if (input.profileRevision !== undefined && input.profileRevision !== profile.revisionId) return safeFailure(profile, depth, "PROFILE_REVISION_MISMATCH");
  if ((input.rawUrl === undefined) === (input.url === undefined)) return safeFailure(profile, depth, "URL_INVALID");
  const rawUrl = input.rawUrl ?? input.url!;
  const rawFailure = validateRawUrl(rawUrl);
  if (rawFailure !== null) return safeFailure(profile, depth, rawFailure);
  let url: URL;
  try {
    const resolutionBase = input.sourceUrl ?? input.baseUrl ?? profile.baseUrl;
    url = resolutionBase === undefined ? new URL(rawUrl) : new URL(rawUrl, resolutionBase);
  } catch {
    return safeFailure(profile, depth, "URL_INVALID");
  }
  if (!isHttp(url)) return safeFailure(profile, depth, "SCHEME_NOT_ALLOWED");
  if (url.username !== "" || url.password !== "") return safeFailure(profile, depth, "URL_CREDENTIALS_FORBIDDEN");
  let canonicalHost: string;
  try {
    canonicalHost = canonicalHostname(url.hostname);
    url.hostname = canonicalHost.includes(":") ? `[${canonicalHost}]` : canonicalHost;
  } catch { return safeFailure(profile, depth, "URL_INVALID"); }
  url.pathname = uppercaseEscapes(url.pathname);
  const hostClass = classifyHost(canonicalHost);
  const matched: string[] = [];
  const matchedRules: ScopeDecision["matchedRules"][number][] = [];
  const reasons: ScopeReasonCode[] = [];
  let eligible = true;
  const deniedDomain = profile.domainRules.find((rule) => rule.effect === "deny" && domainMatches(canonicalHost, rule, url));
  const allowedDomain = profile.domainRules.find((rule) => rule.effect === "allow" && domainMatches(canonicalHost, rule, url));
  if (deniedDomain !== undefined) { matched.push(deniedDomain.ruleId); matchedRules.push({ ruleId: deniedDomain.ruleId, ruleType: "domain", ruleAction: deniedDomain.effect, ruleMatch: deniedDomain.match }); reasons.push("DOMAIN_DENIED"); eligible = false; }
  else if (allowedDomain === undefined) { reasons.push("DOMAIN_NOT_ALLOWED"); eligible = false; }
  else { matched.push(allowedDomain.ruleId); matchedRules.push({ ruleId: allowedDomain.ruleId, ruleType: "domain", ruleAction: allowedDomain.effect, ruleMatch: allowedDomain.match }); }
  const deniedPath = profile.pathRules.find((rule) => rule.effect === "deny" && pathMatches(url.pathname, rule));
  const allowPathRules = profile.pathRules.filter((rule) => rule.effect === "allow");
  const allowedPath = allowPathRules.find((rule) => pathMatches(url.pathname, rule));
  if (deniedPath !== undefined) { matched.push(deniedPath.ruleId); matchedRules.push({ ruleId: deniedPath.ruleId, ruleType: "path", ruleAction: deniedPath.effect, ruleMatch: deniedPath.match }); reasons.push("PATH_DENIED"); eligible = false; }
  else if (allowPathRules.length > 0 && allowedPath === undefined) { reasons.push("PATH_NOT_ALLOWED"); eligible = false; }
  else if (allowedPath !== undefined) { matched.push(allowedPath.ruleId); matchedRules.push({ ruleId: allowedPath.ruleId, ruleType: "path", ruleAction: allowedPath.effect, ruleMatch: allowedPath.match }); }

  const ruleMap = new Map(profile.queryPolicy.rules.map((rule) => [rule.key, rule]));
  const normalizedPairs: { key: string; value: string; index: number }[] = [];
  const identityPairs: { key: string; value: string; index: number }[] = [];
  const identityKeys = new Set<string>();
  const omittedKeys = new Set<string>();
  const deniedKeys = new Set<string>();
  const matchedQueryKeys = new Set<string>();
  let index = 0;
  for (const [keyValue, value] of url.searchParams) {
    const key = keyValue.toLowerCase();
    const rule = ruleMap.get(key);
    const classification = rule?.classification ?? profile.queryPolicy.unknown;
    if (rule !== undefined && !matchedQueryKeys.has(rule.key)) {
      matchedQueryKeys.add(rule.key);
      matched.push(rule.key);
      matchedRules.push({ ruleId: rule.key, ruleType: "query", ruleAction: rule.classification, ruleMatch: "key" });
    }
    if (rule?.sensitive === true) { omittedKeys.add(key); reasons.push("SENSITIVE_QUERY_REMOVED"); }
    else normalizedPairs.push({ key: keyValue, value, index });
    if (classification === "denied") { deniedKeys.add(key); reasons.push("QUERY_DENIED"); eligible = false; }
    else if (rule?.sensitive === true) { index += 1; continue; }
    else if (classification === "tracking" || classification === "ignored") omittedKeys.add(key);
    else { identityPairs.push({ key: keyValue, value, index }); identityKeys.add(key); }
    index += 1;
  }
  const sortPairs = (pairs: { key: string; value: string; index: number }[]) => pairs.sort((a, b) => ordinalCompare(a.key, b.key) || ordinalCompare(a.value, b.value) || a.index - b.index);
  const applyPairs = (target: URL, pairs: { key: string; value: string }[]) => {
    target.search = "";
    for (const pair of pairs) target.searchParams.append(pair.key, pair.value);
  };
  const normalized = new URL(url.href);
  const identity = new URL(url.href);
  applyPairs(normalized, sortPairs(normalizedPairs));
  applyPairs(identity, sortPairs(identityPairs));
  const fragment = url.hash;
  let decodedFragment = fragment;
  try { decodedFragment = decodeURIComponent(fragment); } catch { /* URL percent validation already rejected malformed escapes. */ }
  const sensitiveFragment = /(?:^|[?&;/#])(?:access_token|api_key|apikey|auth|code|password|secret|session|token)=/i.test(decodedFragment);
  if (sensitiveFragment) reasons.push("SENSITIVE_FRAGMENT_REMOVED");
  const preserveFragment = !sensitiveFragment && (profile.fragmentPolicy === "preserve-all" || (profile.fragmentPolicy === "preserve-hash-routes" && fragment.startsWith("#/")));
  if (!preserveFragment) { normalized.hash = ""; identity.hash = ""; }
  const ipAuthorized = hostClass === "unknown-hostname" || hostClass === "public" || profile.networkPolicy.allowedIpClasses.includes(hostClass as never);
  if (!ipAuthorized) { reasons.push("PRIVATE_NETWORK_NOT_ALLOWED"); eligible = false; }
  if (profile.limits.maxDepth !== null && depth > profile.limits.maxDepth) { reasons.push("DEPTH_LIMIT_REACHED"); eligible = false; }
  const identityUrl = identity.href;
  const identityHash = sha256(`scope-identity-v${SCOPE_ENGINE_VERSION}\n${identityUrl}`);
  const known = new Set(input.knownIdentityHashes ?? []).has(identityHash);
  if (known) reasons.push("KNOWN_IDENTITY");
  if (!known && profile.limits.maxPages !== null && (input.currentEligibleCount ?? 0) >= profile.limits.maxPages) { reasons.push("PAGE_LIMIT_REACHED"); eligible = false; }
  if (eligible) reasons.unshift("URL_ACCEPTED");
  if (profile.authorization.status !== "approved") reasons.push("PROFILE_AUTHORIZATION_INCOMPLETE");
  const decisionBasis = JSON.stringify({ engineVersion: SCOPE_ENGINE_VERSION, profileId: profile.profileId, revisionId: profile.revisionId, normalizedUrl: normalized.href, identityUrl, depth, discoveryType: input.discoveryType ?? "manual", currentEligibleCount: input.currentEligibleCount ?? 0, known, reasons, matched });
  return {
    decisionId: sha256(decisionBasis), engineVersion: SCOPE_ENGINE_VERSION, profileId: profile.profileId, profileRevisionId: profile.revisionId,
    eligible, shouldQueue: eligible && profile.authorization.status === "approved", reasonCodes: [...new Set(reasons)], normalizedUrl: normalized.href,
    identityUrl, identityHash, displayUrl: normalized.href, matchedRuleIds: matched, matchedRules, depth,
    security: { hostClass, networkAuthorized: hostClass === "public" || (hostClass !== "unknown-hostname" && ipAuthorized), networkPreflightRequired: hostClass === "unknown-hostname" },
    relation: relationToSeeds(url, profile.seedUrls),
    query: { identityKeys: [...identityKeys].sort(), omittedKeys: [...omittedKeys].sort(), deniedKeys: [...deniedKeys].sort() },
  };
}

export function evaluateScopeBatch(profile: SiteProfile, inputs: readonly ScopeEvaluationInput[]): readonly ScopeDecision[] {
  if (inputs.length > profile.limits.maxBatchSize || inputs.length > SCOPE_LIMITS.batch) throw new ScopeEngineError("SCOPE_BATCH_LIMIT_EXCEEDED", "Scope evaluation batch exceeds the configured bound");
  return inputs.map((input) => evaluateScope(profile, input));
}

export function classifyCanonical(profile: SiteProfile, source: ScopeEvaluationInput, canonicalUrl: string, knownAliases: Readonly<Record<string, string>> = {}): CanonicalDecision {
  const sourceDecision = evaluateScope(profile, source);
  const { rawUrl: _rawUrl, url: _url, ...sourceContext } = source;
  const canonical = evaluateScope(profile, { ...sourceContext, rawUrl: canonicalUrl, baseUrl: sourceDecision.normalizedUrl ?? source.sourceUrl ?? source.baseUrl });
  if (sourceDecision.identityHash === null || canonical.identityHash === null) return { classification: "rejected-invalid", reasonCodes: ["CANONICAL_INVALID"], sourceIdentityHash: sourceDecision.identityHash, canonicalIdentityHash: canonical.identityHash };
  if (!canonical.eligible) return { classification: profile.canonicalPolicy.external === "ignore" && canonical.reasonCodes.includes("DOMAIN_NOT_ALLOWED") ? "ignored-external" : "rejected-out-of-scope", reasonCodes: canonical.reasonCodes, sourceIdentityHash: sourceDecision.identityHash, canonicalIdentityHash: canonical.identityHash };
  if (sourceDecision.identityHash === canonical.identityHash) return { classification: "accepted-same-identity", reasonCodes: ["CANONICAL_SAME_IDENTITY"], sourceIdentityHash: sourceDecision.identityHash, canonicalIdentityHash: canonical.identityHash };
  const visited = new Set<string>();
  let cursor: string | undefined = canonical.identityHash;
  while (cursor !== undefined) {
    if (cursor === sourceDecision.identityHash || visited.has(cursor)) return { classification: "conflict", reasonCodes: ["CANONICAL_CYCLE"], sourceIdentityHash: sourceDecision.identityHash, canonicalIdentityHash: canonical.identityHash };
    visited.add(cursor);
    cursor = knownAliases[cursor];
  }
  const existing = knownAliases[sourceDecision.identityHash];
  if (existing !== undefined && existing !== canonical.identityHash) return { classification: "conflict", reasonCodes: ["CANONICAL_CONFLICT"], sourceIdentityHash: sourceDecision.identityHash, canonicalIdentityHash: canonical.identityHash };
  return { classification: existing === canonical.identityHash ? "alias" : "accepted-new-identity", reasonCodes: [existing === canonical.identityHash ? "CANONICAL_ALIAS_KNOWN" : "CANONICAL_NEW_IDENTITY"], sourceIdentityHash: sourceDecision.identityHash, canonicalIdentityHash: canonical.identityHash };
}

export function classifyRedirect(profile: SiteProfile, input: { sourceUrl: string; targetUrl: string; statusCode: number; chain: readonly string[]; depth?: number }): RedirectDecision {
  const target = evaluateScope(profile, { url: input.targetUrl, baseUrl: input.sourceUrl, depth: input.depth ?? 0 });
  if (![301, 302, 303, 307, 308].includes(input.statusCode) || target.normalizedUrl === null) return { classification: "stop-invalid", reasonCodes: ["REDIRECT_INVALID"], target };
  if (input.chain.length >= profile.limits.maxRedirects) return { classification: "stop-max-redirects", reasonCodes: ["REDIRECT_LIMIT_REACHED"], target };
  const chainIdentities = new Set(input.chain.map((url) => evaluateScope(profile, { url, baseUrl: input.sourceUrl }).identityHash).filter(Boolean));
  if (target.identityHash !== null && chainIdentities.has(target.identityHash)) return { classification: "stop-loop", reasonCodes: ["REDIRECT_LOOP"], target };
  const source = evaluateScope(profile, { url: input.sourceUrl });
  if (source.normalizedUrl?.startsWith("https:") && target.normalizedUrl.startsWith("http:") && !profile.redirectPolicy.allowHttpsDowngrade) return { classification: "stop-denied", reasonCodes: ["HTTPS_DOWNGRADE_DENIED"], target };
  if (target.eligible && target.relation !== "external") return { classification: "follow-in-scope", reasonCodes: ["REDIRECT_IN_SCOPE"], target };
  if (target.eligible && profile.redirectPolicy.allowApprovedExternal) return { classification: "follow-approved-external", reasonCodes: ["REDIRECT_APPROVED_EXTERNAL"], target };
  if (target.reasonCodes.some((code) => code === "DOMAIN_DENIED" || code === "PATH_DENIED" || code === "QUERY_DENIED" || code === "PRIVATE_NETWORK_NOT_ALLOWED")) return { classification: "stop-denied", reasonCodes: target.reasonCodes, target };
  return { classification: "stop-external", reasonCodes: target.reasonCodes, target };
}

export function getScopeEngineInfo() {
  return Object.freeze({ engineVersion: SCOPE_ENGINE_VERSION, profileSchemaVersion: SITE_PROFILE_SCHEMA_VERSION, identityAlgorithm: `sha256(scope-identity-v${SCOPE_ENGINE_VERSION}\\n<identity-url>)`, limits: SCOPE_LIMITS, networkAccess: false });
}
