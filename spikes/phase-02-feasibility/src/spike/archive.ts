import { mkdir, open, rename, rm, copyFile, stat } from "node:fs/promises";
import path from "node:path";
import { SpikeError } from "./errors.js";
import { assertWithinRoot, toPortablePath } from "./paths.js";

export interface RunPaths {
  outputRoot: string;
  temporaryRun: string;
  finalRun: string;
  archive: string;
  runtime: string;
  evidence: string;
  logs: string;
}

export interface ArchiveMetadata {
  schemaVersion: "phase-02-spike-v1";
  experimental: true;
  runId: string;
  originalUrl: string;
  finalUrl: string;
  title: string;
  renderStartedAt: string;
  renderCompletedAt: string;
  renderDurationMs: number;
  consoleErrorCount: number;
  failedRequestCount: number;
  chromiumVersion: string;
  browserExecutable: string;
  archiveEntry: "archive/index.html";
}

export function serializeMetadata(metadata: ArchiveMetadata): string {
  return `${JSON.stringify(metadata, null, 2)}\n`;
}

export async function writeTextAtomic(
  finalPath: string,
  contents: string,
): Promise<void> {
  await mkdir(path.dirname(finalPath), { recursive: true });
  const temporaryPath = `${finalPath}.${process.pid}.tmp`;
  const handle = await open(temporaryPath, "wx");
  try {
    await handle.writeFile(contents, { encoding: "utf8" });
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporaryPath, finalPath);
}

export async function writeJsonAtomic(
  finalPath: string,
  value: unknown,
): Promise<void> {
  await writeTextAtomic(finalPath, `${JSON.stringify(value, null, 2)}\n`);
}

export async function prepareRunPaths(
  outputRoot: string,
  runId: string,
): Promise<RunPaths> {
  const resolvedOutput = path.resolve(outputRoot);
  const temporaryRun = path.join(resolvedOutput, ".working", runId);
  const finalRun = path.join(resolvedOutput, "runs", runId);
  assertWithinRoot(resolvedOutput, temporaryRun);
  assertWithinRoot(resolvedOutput, finalRun);

  try {
    await stat(finalRun);
    throw new SpikeError(
      "SPIKE_ARCHIVE_WRITE_ERROR",
      "The generated Run ID already has a final output directory.",
      { recoverable: false },
    );
  } catch (error) {
    if (error instanceof SpikeError) {
      throw error;
    }
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  const archive = path.join(temporaryRun, "archive");
  const runtime = path.join(temporaryRun, "runtime");
  const evidence = path.join(temporaryRun, "evidence");
  const logs = path.join(temporaryRun, "logs");
  await Promise.all(
    [archive, runtime, evidence, logs].map((directory) =>
      mkdir(directory, { recursive: true }),
    ),
  );

  return {
    outputRoot: resolvedOutput,
    temporaryRun,
    finalRun,
    archive,
    runtime,
    evidence,
    logs,
  };
}

export async function copyFixtureArchiveAssets(
  fixtureRoot: string,
  archiveRoot: string,
): Promise<void> {
  await Promise.all(
    ["styles.css", "lazy.svg"].map(async (name) => {
      const source = path.join(fixtureRoot, name);
      const destination = path.join(archiveRoot, name);
      assertWithinRoot(fixtureRoot, source);
      assertWithinRoot(archiveRoot, destination);
      await copyFile(source, destination);
    }),
  );
}

export async function finalizeRun(paths: RunPaths, runId: string): Promise<void> {
  await mkdir(path.dirname(paths.finalRun), { recursive: true });
  await rename(paths.temporaryRun, paths.finalRun);
  await writeJsonAtomic(path.join(paths.outputRoot, "latest.json"), {
    schemaVersion: "phase-02-spike-latest-v1",
    experimental: true,
    runId,
    runLocation: toPortablePath(path.join("runs", runId)),
  });
}

export async function preserveFailedRun(
  paths: RunPaths,
  runId: string,
  failure: unknown,
): Promise<string | null> {
  try {
    await stat(paths.temporaryRun);
  } catch {
    return null;
  }

  const failedRoot = path.join(paths.outputRoot, "failed", runId);
  assertWithinRoot(paths.outputRoot, failedRoot);
  await writeJsonAtomic(path.join(paths.temporaryRun, "evidence", "failure.json"), {
    schemaVersion: "phase-02-spike-failure-v1",
    experimental: true,
    runId,
    failure,
  });
  await mkdir(path.dirname(failedRoot), { recursive: true });
  await rename(paths.temporaryRun, failedRoot);
  return toPortablePath(path.relative(paths.outputRoot, failedRoot));
}

export async function discardTemporaryRun(paths: RunPaths): Promise<void> {
  assertWithinRoot(paths.outputRoot, paths.temporaryRun);
  await rm(paths.temporaryRun, { recursive: true, force: true });
}

