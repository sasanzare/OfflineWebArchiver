import { DatabaseSync } from "node:sqlite";
import { parentPort, workerData } from "node:worker_threads";
import type { QueueRepositoryPort } from "@offline-web-archive/archive-core";
import { QueueOperationError } from "@offline-web-archive/archive-core";
import { configureDatabase, createSqliteQueueRepository } from "@offline-web-archive/persistence-sqlite";

interface WorkerInput {
  databasePath: string;
  now: string;
  method: "enqueue" | "claimNext" | "complete" | "fail" | "scheduleRetry" | "releaseDueRetries" | "getStatistics";
  input: unknown;
}

const request = workerData as WorkerInput;
const port = parentPort;
if (port === null) throw new Error("Queue worker requires a parent port");

port.postMessage({ type: "ready" });
port.once("message", async (message: unknown) => {
  if (message !== "start") throw new Error("Queue worker received an invalid start signal");
  const database = new DatabaseSync(request.databasePath, { allowExtension: false, defensive: true });
  try {
    configureDatabase(database);
    const repository = createSqliteQueueRepository(database, { now: () => request.now });
    let result: unknown;
    switch (request.method) {
      case "enqueue": result = await repository.enqueue(request.input as Parameters<QueueRepositoryPort["enqueue"]>[0]); break;
      case "claimNext": result = await repository.claimNext(request.input as Parameters<QueueRepositoryPort["claimNext"]>[0]); break;
      case "complete": result = await repository.complete(request.input as Parameters<QueueRepositoryPort["complete"]>[0]); break;
      case "fail": result = await repository.fail(request.input as Parameters<QueueRepositoryPort["fail"]>[0]); break;
      case "scheduleRetry": result = await repository.scheduleRetry(request.input as Parameters<QueueRepositoryPort["scheduleRetry"]>[0]); break;
      case "releaseDueRetries": result = await repository.releaseDueRetries(request.input as Parameters<QueueRepositoryPort["releaseDueRetries"]>[0]); break;
      case "getStatistics": result = await repository.getStatistics(request.input as Parameters<QueueRepositoryPort["getStatistics"]>[0]); break;
    }
    port.postMessage({ type: "result", ok: true, result });
  } catch (error) {
    port.postMessage({ type: "result", ok: false, code: error instanceof QueueOperationError ? error.code : "UNEXPECTED_QUEUE_WORKER_ERROR", message: error instanceof Error ? error.message : "unknown" });
  } finally {
    database.close();
    port.close();
  }
});
