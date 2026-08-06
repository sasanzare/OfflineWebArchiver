import { randomUUID } from "node:crypto";
import {
  parseSecretRef,
  serializeSecretRef,
  SECRET_AUDIT_EVENT_TYPES,
  SecretStoreError,
  type SecretBackend,
  type SecretMetadata,
  type SecretRef,
  type SecretStorePort,
} from "@offline-web-archive/archive-core";
import { createInMemorySecretStore, InMemorySecretStore, type InMemorySecretStoreOptions } from "./memory.js";
import { createOsProtectedSecretStore, getOsProtectedBackendStatus, OsProtectedSecretStore, type OsProtectedSecretStoreOptions, type SafeStoragePort } from "./os.js";
import { createPortableSecretStore, PortableVaultSecretStore, type PortableVaultOptions } from "./vault.js";

export * from "./crypto.js";
export * from "./diagnostics.js";
export * from "./memory.js";
export * from "./os.js";
export * from "./temp.js";
export * from "./vault.js";

export interface SecretStoreFactoryOptions extends Omit<PortableVaultOptions, "backend"> {
  readonly backend: SecretBackend;
  readonly safeStorage?: SafeStoragePort;
  readonly allowTestOnly?: boolean;
}

export function createSecretStore(options: SecretStoreFactoryOptions): SecretStorePort {
  if (options.backend === "memory_test") {
    if (options.allowTestOnly !== true) throw new SecretStoreError("SECRET_PRODUCTION_TEST_BACKEND", "The test-only Secret Store cannot be selected by a production factory");
    return createInMemorySecretStore({ projectId: options.projectId, ...(options.now === undefined ? {} : { now: options.now }), ...(options.id === undefined ? {} : { id: options.id }) });
  }
  if (options.backend === "portable_vault") return createPortableSecretStore({
    projectRoot: options.projectRoot,
    projectId: options.projectId,
    ...(options.now === undefined ? {} : { now: options.now }),
    ...(options.id === undefined ? {} : { id: options.id }),
    ...(options.testMode === undefined ? {} : { testMode: options.testMode }),
    ...(options.inactivityTimeoutMs === undefined ? {} : { inactivityTimeoutMs: options.inactivityTimeoutMs }),
    ...(options.audit === undefined ? {} : { audit: options.audit }),
    backend: "portable_vault",
  });
  if (options.backend === "os_protected") {
    if (options.safeStorage === undefined) throw new SecretStoreError("SECRET_BACKEND_UNAVAILABLE", "The OS Secret Store adapter was not provided");
    return createOsProtectedSecretStore({ ...options, safeStorage: options.safeStorage });
  }
  throw new SecretStoreError("SECRET_BACKEND_UNSUPPORTED", "The selected Secret Store backend is unsupported");
}

export function createProductionSecretStore(options: Omit<SecretStoreFactoryOptions, "allowTestOnly">): SecretStorePort {
  if (options.backend === "memory_test") throw new SecretStoreError("SECRET_PRODUCTION_TEST_BACKEND", "The test-only Secret Store cannot be selected in production");
  return createSecretStore({ ...options, testMode: false, allowTestOnly: false });
}

export function createSecretReference(projectId: string, secretId = randomUUID()): SecretRef {
  return serializeSecretRef({ projectId, secretId });
}

export function inspectSecretReference(value: unknown): { readonly projectId: string; readonly secretId: string; readonly version: 1 } {
  const parsed = parseSecretRef(value);
  return { projectId: parsed.projectId, secretId: parsed.secretId, version: parsed.version };
}

export function safeSecretMetadata(metadata: SecretMetadata): Readonly<Record<string, unknown>> {
  return {
    ref: metadata.ref,
    secretId: metadata.secretId,
    projectId: metadata.projectId,
    scope: { scopeType: metadata.scope.scopeType, projectId: metadata.scope.projectId, scopeId: metadata.scope.scopeId },
    kind: metadata.kind,
    backend: metadata.backend,
    createdAt: metadata.createdAt,
    updatedAt: metadata.updatedAt,
    lastRotatedAt: metadata.lastRotatedAt,
    version: metadata.version,
    lifecycleState: metadata.lifecycleState,
    displayLabel: metadata.displayLabel,
    secureExportPolicy: metadata.secureExportPolicy,
    encryptionEnvelopeVersion: metadata.encryptionEnvelopeVersion,
    keySlotId: metadata.keySlotId,
    migrationState: metadata.migrationState,
  };
}

export function sanitizeSecretAuditEvent(event: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  const allowed = ["timestamp", "eventType", "projectId", "secretId", "kind", "purpose", "backend", "result", "errorCategory"] as const;
  const output: Record<string, unknown> = {};
  for (const key of allowed) {
    const value = event[key];
    if (value === undefined) continue;
    if (typeof value === "string" && value.length <= 256 && !/[\u0000-\u001f\u007f]/.test(value)) {
      if (key === "eventType" && !(SECRET_AUDIT_EVENT_TYPES as readonly string[]).includes(value)) continue;
      output[key] = value;
    }
    else if (value === null) output[key] = null;
  }
  return output;
}

export type {
  InMemorySecretStoreOptions,
  OsProtectedSecretStoreOptions,
  PortableVaultOptions,
  SafeStoragePort,
};
