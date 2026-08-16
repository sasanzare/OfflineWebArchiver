import { createHash, randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  AssetOperationError,
  canonicalAssetContentPath,
  canonicalAssetPartialPath,
  canonicalAssetSourcePath,
  canonicalAssetIdentity,
  canonicalAssetRedirectUrl,
  normalizeAssetContentType,
  normalizeAssetValidator,
  validateAssetRedirectLimit,
  type AssetContent,
  type AssetLeaseInput,
  type AssetRepositoryPort,
  type AssetSource,
  type AssetSourceInput,
  type AssetType,
} from "@offline-web-archive/archive-core";

type Row = Record<string, string | number | null | bigint>;

export interface SqliteAssetRepositoryOptions {
  readonly now?: () => string;
  readonly id?: () => string;
}

const ASSET_SOURCE_SELECT = `
  SELECT a.*,
    c.content_id AS content_content_id,
    c.project_id AS content_project_id,
    c.sha256 AS content_sha256,
    c.byte_length AS content_byte_length,
    c.storage_relative_path AS content_storage_relative_path,
    c.content_type AS content_content_type,
    c.created_at AS content_created_at,
    c.verified_at AS content_verified_at
  FROM asset_sources a
  LEFT JOIN asset_contents c ON c.content_id = a.content_id
`;

function value(row: Row, key: string): string | number | null | bigint {
  return row[key] ?? null;
}

function text(row: Row, key: string): string {
  return String(value(row, key));
}

function nullableText(row: Row, key: string): string | null {
  const entry = value(row, key);
  return entry === null ? null : String(entry);
}

function nullableNumber(row: Row, key: string): number | null {
  const entry = value(row, key);
  return entry === null ? null : Number(entry);
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function assertText(valueToCheck: string, label: string, maximum: number): string {
  if (typeof valueToCheck !== "string" || valueToCheck.trim().length === 0 || valueToCheck.length > maximum || /[\u0000-\u001f\u007f]/.test(valueToCheck)) {
    throw new AssetOperationError("ASSET_INPUT_INVALID", `${label} is invalid`);
  }
  return valueToCheck;
}

function rowToContent(row: Row, prefix = "content_"): AssetContent | null {
  const contentId = nullableText(row, `${prefix}content_id`);
  if (contentId === null) return null;
  return {
    contentId,
    projectId: text(row, `${prefix}project_id`),
    sha256: text(row, `${prefix}sha256`),
    byteLength: Number(value(row, `${prefix}byte_length`)),
    storageRelativePath: text(row, `${prefix}storage_relative_path`),
    contentType: nullableText(row, `${prefix}content_type`),
    createdAt: text(row, `${prefix}created_at`),
    verifiedAt: nullableText(row, `${prefix}verified_at`),
  };
}

function rowToSource(row: Row): AssetSource {
  let redirectChain: readonly string[] = [];
  try {
    const parsed = JSON.parse(text(row, "redirect_chain_json"));
    if (Array.isArray(parsed)) redirectChain = parsed.map((entry) => String(entry));
  } catch {
    throw new AssetOperationError("ASSET_PERSISTENCE_FAILED", "The persisted Asset redirect chain is invalid");
  }
  return {
    assetSourceId: text(row, "asset_source_id"),
    projectId: text(row, "project_id"),
    runId: text(row, "run_id"),
    projectRevisionId: text(row, "project_revision_id"),
    pageJobId: text(row, "page_job_id"),
    originalUrl: text(row, "original_url"),
    normalizedUrl: text(row, "normalized_url"),
    identityHash: text(row, "identity_hash"),
    assetType: text(row, "asset_type") as AssetType,
    sourceRelativePath: text(row, "source_relative_path"),
    state: text(row, "state") as AssetSource["state"],
    statusCode: nullableNumber(row, "status_code"),
    contentType: nullableText(row, "content_type"),
    byteLength: nullableNumber(row, "byte_length"),
    sha256: nullableText(row, "sha256"),
    storageRelativePath: nullableText(row, "storage_relative_path"),
    etag: nullableText(row, "etag"),
    lastModified: nullableText(row, "last_modified"),
    validator: nullableText(row, "validator"),
    expectedBytes: nullableNumber(row, "expected_bytes"),
    resumeOffset: Number(value(row, "resume_offset")),
    partialRelativePath: nullableText(row, "partial_relative_path"),
    redirectChain,
    claimJobId: nullableText(row, "claim_job_id"),
    claimedBy: nullableText(row, "claimed_by"),
    fencingGeneration: Number(value(row, "fencing_generation")),
    errorCode: nullableText(row, "error_code"),
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at"),
    completedAt: nullableText(row, "completed_at"),
    content: rowToContent(row),
  };
}

export function createSqliteAssetRepository(database: DatabaseSync, options: SqliteAssetRepositoryOptions = {}): AssetRepositoryPort {
  const now = options.now ?? (() => new Date().toISOString());
  const id = options.id ?? randomUUID;

  const transaction = <T>(operation: () => T): T => {
    try {
      database.exec("BEGIN IMMEDIATE");
      const result = operation();
      database.exec("COMMIT");
      return result;
    } catch (error) {
      if (database.isTransaction) database.exec("ROLLBACK");
      if (error instanceof AssetOperationError) throw error;
      throw new AssetOperationError("ASSET_PERSISTENCE_FAILED", "The Asset persistence transaction failed safely", true);
    }
  };

  const requireProjectRun = (projectId: string, runId: string): void => {
    const row = database.prepare(`
      SELECT r.run_id FROM project_metadata pm
      JOIN runs r ON r.project_id = pm.project_id
      WHERE pm.singleton_id = 1 AND pm.project_id = ? AND r.run_id = ?
    `).get(projectId, runId);
    if (row === undefined) throw new AssetOperationError("ASSET_NOT_FOUND", "The Asset Project or Run was not found");
  };

  const sourceRow = (projectId: string, runId: string, assetSourceId: string): Row | undefined => database.prepare(`
    ${ASSET_SOURCE_SELECT}
    WHERE a.project_id = ? AND a.run_id = ? AND a.asset_source_id = ?
  `).get(projectId, runId, assetSourceId) as Row | undefined;

  const requireSourceRow = (projectId: string, runId: string, assetSourceId: string): Row => {
    const row = sourceRow(projectId, runId, assetSourceId);
    if (row === undefined) throw new AssetOperationError("ASSET_NOT_FOUND", "The Asset source was not found");
    return row;
  };

  const requirePageJob = (input: { readonly projectId: string; readonly runId: string; readonly pageJobId: string; readonly projectRevisionId?: string }): void => {
    const row = database.prepare(`
      SELECT project_id, run_id, project_revision_id FROM page_jobs
      WHERE project_id = ? AND run_id = ? AND job_id = ?
    `).get(input.projectId, input.runId, input.pageJobId) as { project_id: string; run_id: string; project_revision_id: string } | undefined;
    if (row === undefined || row.project_id !== input.projectId || row.run_id !== input.runId || (input.projectRevisionId !== undefined && row.project_revision_id !== input.projectRevisionId)) {
      throw new AssetOperationError("ASSET_NOT_FOUND", "The Asset Page Job ownership boundary is invalid");
    }
  };

  const assertLease = (input: AssetLeaseInput): Row => {
    requireProjectRun(input.projectId, input.runId);
    const lease = database.prepare(`
      SELECT * FROM job_leases
      WHERE project_id = ? AND run_id = ? AND job_id = ? AND status = 'active'
    `).get(input.projectId, input.runId, input.jobId) as Row | undefined;
    if (lease === undefined) throw new AssetOperationError("ASSET_LEASE_INVALID", "No active Lease owns the Asset Page Job");
    if (tokenHash(input.leaseToken) !== text(lease, "lease_token_hash")) throw new AssetOperationError("ASSET_LEASE_INVALID", "The Asset Lease Token is invalid");
    if (input.ownerId !== text(lease, "owner_id")) throw new AssetOperationError("ASSET_LEASE_INVALID", "The Asset Lease owner is invalid");
    if (input.fencingGeneration !== Number(value(lease, "fencing_generation"))) throw new AssetOperationError("ASSET_STALE_GENERATION", "The Asset fencing generation is stale");
    const job = database.prepare("SELECT fencing_generation, state FROM page_jobs WHERE project_id = ? AND run_id = ? AND job_id = ?").get(input.projectId, input.runId, input.jobId) as { fencing_generation: number; state: string } | undefined;
    if (job === undefined) throw new AssetOperationError("ASSET_NOT_FOUND", "The Asset Page Job was not found");
    if (Number(job.fencing_generation) !== input.fencingGeneration) throw new AssetOperationError("ASSET_STALE_GENERATION", "The Asset Page Job has advanced to a newer generation");
    if (Date.parse(text(lease, "expires_at")) <= Date.parse(now())) throw new AssetOperationError("ASSET_LEASE_INVALID", "The Asset Lease has expired", true);
    return lease;
  };

  const assertClaim = (input: AssetLeaseInput & { readonly assetSourceId: string }): Row => {
    assertLease(input);
    const row = requireSourceRow(input.projectId, input.runId, input.assetSourceId);
    if (nullableText(row, "claim_job_id") !== input.jobId || nullableText(row, "claimed_by") !== input.ownerId || Number(value(row, "fencing_generation")) !== input.fencingGeneration) {
      throw new AssetOperationError("ASSET_STALE_GENERATION", "The Asset source is owned by a newer or different worker");
    }
    return row;
  };

  const safeSourceInput = (input: AssetSourceInput): { readonly identity: ReturnType<typeof canonicalAssetIdentity>; readonly assetType: AssetType; readonly relationKind: string } => {
    const identity = canonicalAssetIdentity(input.identity);
    const relationKind = assertText(input.relationKind, "The Asset relation kind", 120);
    if (!/^[a-z0-9][a-z0-9._:-]*$/i.test(relationKind)) throw new AssetOperationError("ASSET_INPUT_INVALID", "The Asset relation kind is invalid");
    return { identity, assetType: input.assetType, relationKind };
  };

  const repository: AssetRepositoryPort = {
    async ensureAssetSource(input) {
      const safe = safeSourceInput(input);
      return transaction(() => {
        requireProjectRun(input.projectId, input.runId);
        requirePageJob({ projectId: input.projectId, runId: input.runId, pageJobId: input.pageJobId, projectRevisionId: input.projectRevisionId });
        const sourceRelativePath = canonicalAssetSourcePath({ assetType: safe.assetType, identityHash: safe.identity.identityHash });
        const existing = database.prepare(`
          SELECT asset_source_id FROM asset_sources
          WHERE project_id = ? AND run_id = ? AND normalized_url = ?
        `).get(input.projectId, input.runId, safe.identity.normalizedUrl) as { asset_source_id: string } | undefined;
        let assetSourceId = existing?.asset_source_id;
        if (assetSourceId === undefined) {
          assetSourceId = id();
          try {
            database.prepare(`
              INSERT INTO asset_sources
                (asset_source_id, project_id, run_id, project_revision_id, page_job_id,
                 original_url, normalized_url, identity_hash, asset_type, source_relative_path,
                 state, redirect_chain_json, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', '[]', ?, ?)
            `).run(
              assetSourceId, input.projectId, input.runId, input.projectRevisionId, input.pageJobId,
              safe.identity.originalUrl, safe.identity.normalizedUrl, safe.identity.identityHash, safe.assetType, sourceRelativePath, now(), now(),
            );
          } catch (error) {
            if (!(error instanceof Error && /UNIQUE/i.test(error.message))) throw error;
            const raced = database.prepare(`SELECT asset_source_id FROM asset_sources WHERE project_id = ? AND run_id = ? AND normalized_url = ?`).get(input.projectId, input.runId, safe.identity.normalizedUrl) as { asset_source_id: string } | undefined;
            if (raced === undefined) throw error;
            assetSourceId = raced.asset_source_id;
          }
        } else {
          const current = requireSourceRow(input.projectId, input.runId, assetSourceId);
          if (text(current, "identity_hash") !== safe.identity.identityHash || text(current, "asset_type") !== safe.assetType) {
            throw new AssetOperationError("ASSET_CONTENT_CONFLICT", "The normalized Asset URL has conflicting identity metadata");
          }
        }
        database.prepare(`
          INSERT OR IGNORE INTO page_asset_relations
            (project_id, run_id, page_job_id, asset_source_id, relation_kind, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(input.projectId, input.runId, input.pageJobId, assetSourceId, safe.relationKind, now());
        return rowToSource(requireSourceRow(input.projectId, input.runId, assetSourceId));
      });
    },

    async getAssetSource(input) {
      requireProjectRun(input.projectId, input.runId);
      return rowToSource(requireSourceRow(input.projectId, input.runId, input.assetSourceId));
    },

    async beginAssetDownload(input) {
      return transaction(() => {
        const currentRow = requireSourceRow(input.projectId, input.runId, input.assetSourceId);
        if (text(currentRow, "state") === "completed") return rowToSource(currentRow);
        if (text(currentRow, "state") === "downloading" && nullableText(currentRow, "claim_job_id") === input.jobId && nullableText(currentRow, "claimed_by") === input.ownerId && Number(value(currentRow, "fencing_generation")) === input.fencingGeneration) return rowToSource(currentRow);
        assertLease(input);
        const currentClaim = nullableText(currentRow, "claim_job_id");
        if (text(currentRow, "state") === "downloading" && currentClaim !== null) {
          const active = database.prepare(`SELECT expires_at FROM job_leases WHERE job_id = ? AND status = 'active'`).get(currentClaim) as { expires_at: string } | undefined;
          if (active !== undefined && Date.parse(active.expires_at) > Date.parse(now())) throw new AssetOperationError("ASSET_ALREADY_IN_PROGRESS", "Another active worker owns this Asset source", true);
        }
        const partialRelativePath = canonicalAssetPartialPath(input.assetSourceId, input.fencingGeneration);
        database.prepare(`
          UPDATE asset_sources
          SET state = 'downloading', claim_job_id = ?, claimed_by = ?, fencing_generation = ?,
              partial_relative_path = ?, error_code = NULL, updated_at = ?
          WHERE project_id = ? AND run_id = ? AND asset_source_id = ?
        `).run(input.jobId, input.ownerId, input.fencingGeneration, partialRelativePath, now(), input.projectId, input.runId, input.assetSourceId);
        return rowToSource(requireSourceRow(input.projectId, input.runId, input.assetSourceId));
      });
    },

    async assertAssetFinalizationOwnership(input) {
      return rowToSource(assertClaim(input));
    },

    async saveAssetProgress(input) {
      return transaction(() => {
        const row = assertClaim(input);
        const partialPath = canonicalAssetPartialPath(input.assetSourceId, input.fencingGeneration);
        if (partialPath !== input.partialRelativePath || !Number.isSafeInteger(input.bytesWritten) || input.bytesWritten < 0 || !Number.isSafeInteger(input.resumeOffset) || input.resumeOffset < 0 || input.resumeOffset > input.bytesWritten || (input.expectedBytes !== null && input.bytesWritten > input.expectedBytes)) {
          throw new AssetOperationError("ASSET_INPUT_INVALID", "The Asset progress checkpoint is invalid");
        }
        const validator = normalizeAssetValidator(input.validator);
        const etag = normalizeAssetValidator(input.etag);
        const lastModified = normalizeAssetValidator(input.lastModified);
        database.prepare(`
          UPDATE asset_sources
          SET resume_offset = ?, expected_bytes = ?, validator = ?,
              etag = ?, last_modified = ?, updated_at = ?
          WHERE project_id = ? AND run_id = ? AND asset_source_id = ?
        `).run(input.resumeOffset, input.expectedBytes, validator, etag, lastModified, now(), input.projectId, input.runId, input.assetSourceId);
        // bytes_written is deliberately not a persisted column; resume_offset is the durable boundary.
        void row;
        return rowToSource(requireSourceRow(input.projectId, input.runId, input.assetSourceId));
      });
    },

    async finalizeAssetDownload(input) {
      return transaction(() => {
        const currentRow = assertClaim(input);
        const finalUrl = canonicalAssetRedirectUrl(input.finalUrl);
        validateAssetRedirectLimit(input.redirectChain.length);
        const redirectChain = input.redirectChain.map(canonicalAssetRedirectUrl);
        const storageRelativePath = canonicalAssetContentPath(input.sha256);
        const contentType = normalizeAssetContentType(input.contentType);
        if (!Number.isSafeInteger(input.byteLength) || input.byteLength < 0 || !/^[a-f0-9]{64}$/.test(input.sha256)) throw new AssetOperationError("ASSET_INPUT_INVALID", "The Asset finalization metadata is invalid");
        const existingContentRow = database.prepare(`SELECT * FROM asset_contents WHERE project_id = ? AND sha256 = ?`).get(input.projectId, input.sha256) as Row | undefined;
        let content: AssetContent;
        let deduplicated = existingContentRow !== undefined;
        if (existingContentRow === undefined) {
          const contentId = id();
          try {
            database.prepare(`
              INSERT INTO asset_contents
                (content_id, project_id, sha256, byte_length, storage_relative_path, content_type, created_at, verified_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(contentId, input.projectId, input.sha256, input.byteLength, storageRelativePath, contentType, now(), input.completedAt);
          } catch (error) {
            if (!(error instanceof Error && /UNIQUE/i.test(error.message))) throw error;
          }
          const inserted = database.prepare(`SELECT * FROM asset_contents WHERE project_id = ? AND sha256 = ?`).get(input.projectId, input.sha256) as Row | undefined;
          if (inserted === undefined) throw new AssetOperationError("ASSET_CONTENT_CONFLICT", "The Asset content object could not be persisted", true);
          content = {
            contentId: text(inserted, "content_id"), projectId: text(inserted, "project_id"), sha256: text(inserted, "sha256"),
            byteLength: Number(value(inserted, "byte_length")), storageRelativePath: text(inserted, "storage_relative_path"),
            contentType: nullableText(inserted, "content_type"), createdAt: text(inserted, "created_at"), verifiedAt: nullableText(inserted, "verified_at"),
          };
          deduplicated = content.contentId !== contentId;
        } else {
          content = rowToContent({
            content_content_id: value(existingContentRow, "content_id"),
            content_project_id: value(existingContentRow, "project_id"),
            content_sha256: value(existingContentRow, "sha256"),
            content_byte_length: value(existingContentRow, "byte_length"),
            content_storage_relative_path: value(existingContentRow, "storage_relative_path"),
            content_content_type: value(existingContentRow, "content_type"),
            content_created_at: value(existingContentRow, "created_at"),
            content_verified_at: value(existingContentRow, "verified_at"),
          })!;
          if (content.byteLength !== input.byteLength || content.storageRelativePath !== storageRelativePath) throw new AssetOperationError("ASSET_CONTENT_CONFLICT", "The persisted Asset content identity conflicts with the downloaded bytes");
        }
        database.prepare(`
          UPDATE asset_sources
          SET state = 'completed', status_code = ?, content_type = ?, byte_length = ?, sha256 = ?,
              content_id = ?, storage_relative_path = ?, redirect_chain_json = ?, resume_offset = ?,
              partial_relative_path = NULL, claim_job_id = NULL, claimed_by = NULL, error_code = NULL,
              updated_at = ?, completed_at = ?
          WHERE project_id = ? AND run_id = ? AND asset_source_id = ?
        `).run(input.statusCode, contentType, input.byteLength, input.sha256, content.contentId, storageRelativePath, JSON.stringify([finalUrl, ...redirectChain]), input.byteLength, input.completedAt, input.completedAt, input.projectId, input.runId, input.assetSourceId);
        return { source: rowToSource(requireSourceRow(input.projectId, input.runId, input.assetSourceId)), content, deduplicated };
      });
    },

    async markAssetInterrupted(input) {
      return transaction(() => {
        assertClaim(input);
        const errorCode = assertText(input.errorCode, "The Asset error code", 120);
        database.prepare(`
          UPDATE asset_sources
          SET state = 'interrupted', error_code = ?, claim_job_id = NULL, claimed_by = NULL, updated_at = ?
          WHERE project_id = ? AND run_id = ? AND asset_source_id = ?
        `).run(errorCode, now(), input.projectId, input.runId, input.assetSourceId);
        return rowToSource(requireSourceRow(input.projectId, input.runId, input.assetSourceId));
      });
    },

    async getAssetContent(input) {
      if (!/^[a-f0-9]{64}$/.test(input.sha256)) throw new AssetOperationError("ASSET_INPUT_INVALID", "The Asset content hash is invalid");
      const row = database.prepare("SELECT * FROM asset_contents WHERE project_id = ? AND sha256 = ?").get(input.projectId, input.sha256) as Row | undefined;
      if (row === undefined) return null;
      return {
        contentId: text(row, "content_id"), projectId: text(row, "project_id"), sha256: text(row, "sha256"), byteLength: Number(value(row, "byte_length")),
        storageRelativePath: text(row, "storage_relative_path"), contentType: nullableText(row, "content_type"), createdAt: text(row, "created_at"), verifiedAt: nullableText(row, "verified_at"),
      } satisfies AssetContent;
    },

    async listPageAssets(input) {
      requireProjectRun(input.projectId, input.runId);
      const rows = database.prepare(`
        ${ASSET_SOURCE_SELECT}
        JOIN page_asset_relations r ON r.asset_source_id = a.asset_source_id AND r.project_id = a.project_id AND r.run_id = a.run_id
        WHERE r.project_id = ? AND r.run_id = ? AND r.page_job_id = ?
        ORDER BY a.normalized_url, a.asset_source_id
      `).all(input.projectId, input.runId, input.pageJobId) as unknown as Row[];
      return rows.map(rowToSource);
    },

    async listAssetPages(input) {
      requireProjectRun(input.projectId, input.runId);
      const rows = database.prepare(`
        SELECT page_job_id FROM page_asset_relations
        WHERE project_id = ? AND run_id = ? AND asset_source_id = ?
        ORDER BY page_job_id
      `).all(input.projectId, input.runId, input.assetSourceId) as unknown as Array<{ page_job_id: string }>;
      return rows.map((row) => row.page_job_id);
    },
  };
  return Object.freeze(repository);
}
