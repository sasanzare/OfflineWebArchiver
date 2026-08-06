import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { unzipSync } from "fflate";
import {
  SecretStoreError,
  assertValidSecretScope,
  canCaptureScreenshot,
  parseSecretRef,
  serializeSecretRef,
} from "@offline-web-archive/archive-core";
import { exportPathIsAllowed, createProjectArchive } from "@offline-web-archive/persistence-sqlite";
import {
  AuthenticationFailure,
  PRODUCTION_KDF_PROFILE,
  TEST_KDF_PROFILE,
  clearBytes,
  createKdfParameters,
  createPortableSecretStore,
  createProductionSecretStore,
  decryptAead,
  encryptAead,
  getOsProtectedBackendStatus,
  inspectSanitizedDiagnosticBundle,
  createSanitizedDiagnosticBundle,
  createInMemorySecretStore,
  cleanupSensitiveTemporaryData,
  writeSensitiveTemporaryFile,
  sanitizeSecretAuditEvent,
} from "@offline-web-archive/secrets";
import { sanitizeHeaders, sanitizeUrl, sanitizeValue } from "@offline-web-archive/observability";

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_PROJECT_ID = "00000000-0000-4000-8000-000000000002";
const PASSPHRASE = Buffer.from("phase11-test-passphrase");

async function temporaryRoot(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), "owa-phase11-"));
}

function projectScope(projectId = PROJECT_ID) {
  return { scopeType: "project" as const, projectId, scopeId: projectId };
}

function expectSecretError(code: SecretStoreError["code"]) {
  return (error: unknown): boolean => error instanceof SecretStoreError && error.code === code;
}

test("Credential References are canonical, versioned, and Project-isolated", () => {
  const ref = serializeSecretRef({ projectId: PROJECT_ID, secretId: "00000000-0000-4000-8000-000000000010" });
  assert.equal(ref, "secret://v1/project/00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000010");
  assert.deepEqual(parseSecretRef(ref), { serialized: ref, version: 1, projectId: PROJECT_ID, secretId: "00000000-0000-4000-8000-000000000010" });
  assert.throws(() => parseSecretRef(ref.toUpperCase()), expectSecretError("SECRET_REFERENCE_INVALID"));
  assert.throws(() => parseSecretRef("secret://v2/project/00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000010"), expectSecretError("SECRET_REFERENCE_VERSION_UNSUPPORTED"));
  assert.throws(() => assertValidSecretScope({ ...projectScope(), injected: "phase11-fixture" } as never), expectSecretError("SECRET_SCOPE_INVALID"));
});

test("AES-GCM authenticates ciphertext and AAD", () => {
  const key = Buffer.alloc(32, 7);
  const plaintext = Buffer.from("phase11-fixture-value");
  const aad = Buffer.from("metadata-v1");
  const envelope = encryptAead(plaintext, key, aad);
  assert.deepEqual(decryptAead(envelope, key, aad), plaintext);
  const tampered = { ...envelope, tag: Buffer.from(envelope.tag).fill(envelope.tag[0] === 0 ? 1 : 0) };
  assert.throws(() => decryptAead(tampered, key, aad), (error: unknown) => error instanceof AuthenticationFailure);
  assert.throws(() => decryptAead(envelope, key, Buffer.from("different-aad")), (error: unknown) => error instanceof AuthenticationFailure);
  clearBytes(key);
  clearBytes(plaintext);
});

test("Portable Vault keeps Secret values encrypted, supports locking, replacement, rotation, and isolation", async () => {
  const root = await temporaryRoot();
  try {
    const auditEvents: string[] = [];
    const store = createPortableSecretStore({ projectRoot: root, projectId: PROJECT_ID, testMode: true, inactivityTimeoutMs: 60_000, audit: (event) => { auditEvents.push(event.eventType); } });
    await store.initialize({ passphrase: PASSPHRASE });
    const lockedStatus = await store.getBackendStatus();
    assert.equal(lockedStatus.vaultState, "locked");
    const metadataWhileLocked = await store.listSecretMetadata({ projectId: PROJECT_ID });
    assert.deepEqual(metadataWhileLocked, []);
    await store.unlock({ passphrase: PASSPHRASE });
    const metadata = await store.createSecret({ projectId: PROJECT_ID, scope: projectScope(), kind: "generic_project_secret", value: Buffer.from("phase11-fixture-value"), displayLabel: "fixture-value" });
    assert.match(metadata.ref, /^secret:\/\/v1\/project\//);
    const vaultBytes = await readFile(path.join(root, "secrets", "portable-vault.json"));
    assert.equal(vaultBytes.includes("phase11-fixture-value"), false);
    assert.equal((await store.listSecretMetadata({ projectId: PROJECT_ID })).length, 1);
    const consumed = await store.withSecret({ projectId: PROJECT_ID, purpose: "test_fixture", scopeId: PROJECT_ID }, metadata.ref, async (value) => Buffer.from(value).toString("utf8"));
    assert.equal(consumed, "phase11-fixture-value");
    const replaced = await store.replaceSecret({ projectId: PROJECT_ID, ref: metadata.ref, value: Buffer.from("phase11-fixture-replaced"), displayLabel: "fixture-replaced" });
    assert.equal(replaced.version, 2);
    const rotated = await store.rotateSecret({ projectId: PROJECT_ID, ref: metadata.ref });
    assert.equal(rotated.version, 3);
    await store.lock();
    await assert.rejects(() => store.withSecret({ projectId: PROJECT_ID, purpose: "test_fixture" }, metadata.ref, async () => "never"), expectSecretError("SECRET_STORE_LOCKED"));
    await store.unlock({ passphrase: PASSPHRASE });
    const otherStore = createPortableSecretStore({ projectRoot: root, projectId: OTHER_PROJECT_ID, testMode: true, inactivityTimeoutMs: 60_000 });
    await assert.rejects(() => otherStore.withSecret({ projectId: PROJECT_ID, purpose: "test_fixture" }, metadata.ref, async () => "never"), expectSecretError("SECRET_REFERENCE_PROJECT_MISMATCH"));
    await store.deleteSecret({ projectId: PROJECT_ID, ref: metadata.ref });
    assert.ok(auditEvents.includes("vault_initialized"));
    assert.ok(auditEvents.includes("vault_unlocked"));
    assert.ok(auditEvents.includes("secret_created"));
    assert.ok(auditEvents.includes("secret_accessed"));
    assert.ok(auditEvents.includes("secret_replaced"));
    assert.ok(auditEvents.includes("secret_deleted"));
    await store.dispose();
    await otherStore.dispose();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Portable Vault initialization is serialized and leaves one valid promoted file", async () => {
  const root = await temporaryRoot();
  try {
    const first = createPortableSecretStore({ projectRoot: root, projectId: PROJECT_ID, testMode: true, inactivityTimeoutMs: 60_000 });
    const second = createPortableSecretStore({ projectRoot: root, projectId: PROJECT_ID, testMode: true, inactivityTimeoutMs: 60_000 });
    const results = await Promise.allSettled([
      first.initialize({ passphrase: PASSPHRASE }),
      second.initialize({ passphrase: PASSPHRASE }),
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(results.filter((result) => result.status === "rejected").length, 1);
    const rejected = results.find((result) => result.status === "rejected");
    assert.ok(rejected && rejected.reason instanceof SecretStoreError);
    assert.ok(rejected.reason.code === "SECRET_STORE_BUSY" || rejected.reason.code === "SECRET_ALREADY_EXISTS");
    await first.dispose();
    await second.dispose();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Secure Export/Import is encrypted and does not cross the ordinary Project export", async () => {
  const sourceRoot = await temporaryRoot();
  const targetRoot = await temporaryRoot();
  try {
    const source = createPortableSecretStore({ projectRoot: sourceRoot, projectId: PROJECT_ID, testMode: true, inactivityTimeoutMs: 60_000 });
    await source.initialize({ passphrase: PASSPHRASE });
    await source.unlock({ passphrase: PASSPHRASE });
    const metadata = await source.createSecret({ projectId: PROJECT_ID, scope: projectScope(), kind: "api_credential", value: Buffer.from("phase11-secure-export-fixture"), displayLabel: "api-fixture" });
    const secureExportPath = path.join(sourceRoot, "secure-exports", "secure-export.owa");
    const exported = await source.exportSecretsEncrypted({ projectId: PROJECT_ID, destinationPath: secureExportPath, passphrase: Buffer.from("phase11-export-passphrase"), confirm: true });
    assert.equal(exported.secretCount, 1);
    const secureExportBytes = await readFile(secureExportPath);
    assert.equal(secureExportBytes.includes("phase11-secure-export-fixture"), false);
    assert.equal((JSON.parse(secureExportBytes.toString("utf8")) as { readonly kdf: { readonly N: number } }).kdf.N, PRODUCTION_KDF_PROFILE.N);
    const target = createPortableSecretStore({ projectRoot: targetRoot, projectId: PROJECT_ID, testMode: true, inactivityTimeoutMs: 60_000 });
    await target.initialize({ passphrase: PASSPHRASE });
    await target.unlock({ passphrase: PASSPHRASE });
    assert.deepEqual(await target.importSecretsEncrypted({ projectId: PROJECT_ID, sourcePath: secureExportPath, passphrase: Buffer.from("phase11-export-passphrase") }), { importedCount: 1, formatVersion: 1 });
    const imported = await target.withSecret({ projectId: PROJECT_ID, purpose: "test_fixture" }, metadata.ref, async (value) => Buffer.from(value).toString("utf8"));
    assert.equal(imported, "phase11-secure-export-fixture");
    await source.dispose();
    await target.dispose();
  } finally {
    await rm(sourceRoot, { recursive: true, force: true });
    await rm(targetRoot, { recursive: true, force: true });
  }
});

test("Test-only adapter is not selectable by the production factory and can unlock after lock", async () => {
  const store = createInMemorySecretStore({ projectId: PROJECT_ID });
  const metadata = await store.createSecret({ projectId: PROJECT_ID, scope: projectScope(), kind: "generic_project_secret", value: Buffer.from("memory-fixture"), displayLabel: "memory-fixture" });
  await store.lock();
  await store.unlock({ passphrase: PASSPHRASE });
  assert.equal(await store.hasSecret({ projectId: PROJECT_ID, ref: metadata.ref }), true);
  assert.equal(await store.withSecret({ projectId: PROJECT_ID, purpose: "test_fixture" }, metadata.ref, async (value) => Buffer.from(value).toString("utf8")), "memory-fixture");
  await store.dispose();
  assert.throws(() => createProductionSecretStore({ projectRoot: ".", projectId: PROJECT_ID, backend: "memory_test" }), expectSecretError("SECRET_PRODUCTION_TEST_BACKEND"));
  const root = await temporaryRoot();
  try {
    const production = createProductionSecretStore({ projectRoot: root, projectId: PROJECT_ID, backend: "portable_vault", testMode: true, inactivityTimeoutMs: 60_000 });
    await production.initialize({ passphrase: PASSPHRASE });
    const header = JSON.parse((await readFile(path.join(root, "secrets", "portable-vault.json"))).toString("utf8")) as { readonly kdf: { readonly N: number } };
    assert.equal(header.kdf.N, 32_768);
    await production.dispose();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("OS backend rejects Electron basic_text fallback", async () => {
  const status = await getOsProtectedBackendStatus({
    isEncryptionAvailable: () => true,
    getSelectedStorageBackend: () => "basic_text",
    encryptStringAsync: async (value) => Buffer.from(value),
    decryptStringAsync: async (value) => ({ result: Buffer.from(value).toString("utf8"), shouldReEncrypt: false }),
  });
  assert.equal(status.state, "insecure_backend_rejected");
  assert.equal(status.reasonCode, "SECRET_INSECURE_BACKEND");
});

test("redaction covers URLs, headers, nested errors, and audit allowlists", () => {
  const url = sanitizeUrl("https://user:fixture@example.test/path?token=fixture&safe=yes#fragment");
  assert.equal(url.includes("fixture"), false);
  const sanitizedFragment = String(sanitizeValue("https://example.test/callback#access_token=fixture&state=fixture"));
  assert.equal(sanitizedFragment.includes("fixture"), false);
  const headers = sanitizeHeaders({ Authorization: "Bearer fixture", "X-Trace": "safe", Cookie: "fixture-cookie" });
  assert.deepEqual(headers, { Authorization: "[redacted]", "X-Trace": "safe", Cookie: "[redacted]" });
  const value = sanitizeValue({ request: { url: "https://example.test/?secret=fixture", headers }, error: new Error("token=fixture") });
  assert.equal(JSON.stringify(value).includes("fixture"), false);
  assert.deepEqual(sanitizeSecretAuditEvent({ eventType: "secret_accessed", projectId: PROJECT_ID, secretId: "secret-id", rawValue: "fixture" }), { eventType: "secret_accessed", projectId: PROJECT_ID, secretId: "secret-id" });
  assert.deepEqual(sanitizeSecretAuditEvent({ eventType: "secret_accessed\nforged", projectId: `${PROJECT_ID}\nforged` }), {});
});

test("diagnostics and sensitive temporary data are allowlisted and cleaned", async () => {
  const root = await temporaryRoot();
  try {
    const diagnosticPath = path.join(root, "diagnostic.zip");
    const result = await createSanitizedDiagnosticBundle({
      destinationPath: diagnosticPath,
      createdAt: "2026-08-06T12:00:00.000Z",
      application: { version: "0.8.0", secret: "fixture" },
      platform: { operatingSystem: "test" },
      logs: [{ url: "https://example.test/?token=fixture", Authorization: "Bearer fixture" }],
      errors: [{ message: "password=fixture" }],
    });
    assert.equal(result.sanitizationVersion, 1);
    const diagnosticBytes = await readFile(diagnosticPath);
    assert.deepEqual(inspectSanitizedDiagnosticBundle(diagnosticBytes), ["diagnostic-manifest.json", "diagnostic/application.json", "diagnostic/configuration.json", "diagnostic/errors.json", "diagnostic/interaction-traces.json", "diagnostic/logs.json", "diagnostic/migration-status.json", "diagnostic/platform.json", "diagnostic/project.json", "diagnostic/runtime-status.json", "diagnostic/validation.json"]);
    const diagnosticEntries = unzipSync(diagnosticBytes);
    const diagnosticText = Buffer.concat(Object.values(diagnosticEntries).map((entry) => Buffer.from(entry))).toString("utf8");
    assert.equal(diagnosticText.includes("fixture"), false);
    const tempFile = await writeSensitiveTemporaryFile(root, Buffer.from("temporary-fixture"));
    assert.equal((await readFile(tempFile)).toString("utf8"), "temporary-fixture");
    const cleaned = await cleanupSensitiveTemporaryData(root);
    assert.equal(cleaned.removed, 1);
    assert.equal(cleaned.retained, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("ordinary Project ZIP export excludes Secret and Secure Export directories", async () => {
  const root = await temporaryRoot();
  try {
    await mkdir(path.join(root, "pages"), { recursive: true });
    await mkdir(path.join(root, "secrets"), { recursive: true });
    await mkdir(path.join(root, "secure-exports"), { recursive: true });
    await mkdir(path.join(root, "diagnostics"), { recursive: true });
    await writeFile(path.join(root, "pages", "page.html"), "safe page");
    await writeFile(path.join(root, "secrets", "portable-vault.json"), "phase11-fixture-value");
    await writeFile(path.join(root, "secure-exports", "export.owa"), "phase11-fixture-value");
    await writeFile(path.join(root, "diagnostics", "diagnostic.zip"), "phase11-fixture-value");
    assert.equal(exportPathIsAllowed("pages/page.html"), true);
    assert.equal(exportPathIsAllowed("secrets/portable-vault.json"), false);
    assert.equal(exportPathIsAllowed("secure-exports/export.owa"), false);
    assert.equal(exportPathIsAllowed("diagnostics/diagnostic.zip"), false);
    const archive = await createProjectArchive({ projectRoot: root, projectId: PROJECT_ID, exportedAt: "2026-08-06T12:00:00.000Z", databaseSnapshot: Buffer.from("database") });
    const entries = unzipSync(archive.data);
    assert.equal(Object.keys(entries).some((name) => name.startsWith("secrets/") || name.startsWith("secure-exports/") || name.startsWith("diagnostics/")), false);
    assert.equal(Object.keys(entries).includes("pages/page.html"), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("screenshot capture is denied for sensitive or unknown content", () => {
  assert.equal(canCaptureScreenshot({ requested: true, sensitivity: "safe" }), true);
  assert.equal(canCaptureScreenshot({ requested: true, sensitivity: "sensitive" }), false);
  assert.equal(canCaptureScreenshot({ requested: true, sensitivity: "unknown" }), false);
});

test("test KDF profile remains bounded and explicit", () => {
  const kdf = createKdfParameters(TEST_KDF_PROFILE);
  assert.equal(kdf.N, 1_024);
  assert.equal(kdf.r, 8);
  assert.equal(kdf.p, 1);
  assert.equal(kdf.salt.byteLength, 16);
});
