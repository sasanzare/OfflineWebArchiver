import { createHash } from "node:crypto";
import path from "node:path";
import { HTML_REWRITE_CONTRACT_VERSION, type HtmlRewriteArtifactStore } from "@offline-web-archive/archive-core";
import { atomicWriteFile, resolveProjectRelativePath } from "./atomic.js";

export interface RewrittenHtmlArtifact {
  readonly contractVersion: typeof HTML_REWRITE_CONTRACT_VERSION;
  readonly relativePath: string;
  readonly byteLength: number;
  readonly sha256: string;
}

function sha256(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function writeRewrittenHtmlArtifact(input: {
  readonly projectRoot: string;
  readonly jobId: string;
  readonly html: string;
}): Promise<RewrittenHtmlArtifact> {
  const relativePath = `pages/${input.jobId}/rewritten-v${HTML_REWRITE_CONTRACT_VERSION}.html`;
  const target = await resolveProjectRelativePath(path.resolve(input.projectRoot), relativePath);
  const bytes = new TextEncoder().encode(input.html);
  await atomicWriteFile(target, bytes, { overwrite: true });
  return Object.freeze({ contractVersion: HTML_REWRITE_CONTRACT_VERSION, relativePath, byteLength: bytes.byteLength, sha256: sha256(bytes) });
}

export const htmlRewriteArtifactStore: HtmlRewriteArtifactStore = Object.freeze({
  async write(input: Parameters<HtmlRewriteArtifactStore["write"]>[0]): Promise<RewrittenHtmlArtifact> {
    return writeRewrittenHtmlArtifact(input);
  },
});
