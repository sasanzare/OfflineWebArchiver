import { parentPort, workerData } from "node:worker_threads";
import { DatabaseSync } from "node:sqlite";
import { configureDatabase, createSqliteRecoveryRepository } from "@offline-web-archive/persistence-sqlite";

interface WorkerInput {
  databasePath: string;
  now: string;
  method: "claim" | "recover" | "heartbeat";
  input: unknown;
}

const data = workerData as WorkerInput;
const port = parentPort;
if (port === null) throw new Error("Recovery worker requires a parent port");
port.postMessage({ type: "ready" });
port.once("message", async (message) => {
  if (message !== "start") return;
  const database = new DatabaseSync(data.databasePath, { allowExtension: false, defensive: true });
  configureDatabase(database);
  const repository = createSqliteRecoveryRepository(database, { now: () => data.now });
  try {
    const result = data.method === "claim"
      ? await repository.claimNextWithLease(data.input as Parameters<typeof repository.claimNextWithLease>[0])
      : data.method === "recover"
        ? await repository.recover(data.input as Parameters<typeof repository.recover>[0])
        : await repository.heartbeatLease(data.input as Parameters<typeof repository.heartbeatLease>[0]);
    port.postMessage({ type: "result", ok: true, result });
  } catch (error) {
    port.postMessage({ type: "result", ok: false, code: error instanceof Error && "code" in error ? String(error.code) : "UNKNOWN", message: error instanceof Error ? error.message : "Unknown error" });
  } finally {
    database.close();
  }
});
