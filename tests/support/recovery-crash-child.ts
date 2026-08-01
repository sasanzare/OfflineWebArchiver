import { DatabaseSync } from "node:sqlite";
import { configureDatabase, createSqliteProjectStorage, createSqliteRecoveryRepository, type RecoveryFaultPoint } from "@offline-web-archive/persistence-sqlite";

type CrashMessage =
  | { mode: "claim" | "checkpoint" | "recover" | "outputs"; databasePath: string; now: string; faultPoint: RecoveryFaultPoint; input: unknown }
  | { mode: "open-storage"; projectPath: string };

process.send?.({ type: "ready" });
process.once("message", async (raw) => {
  const message = raw as CrashMessage;
  if (message.mode === "open-storage") {
    const storage = createSqliteProjectStorage({ applicationVersion: "0.7.0" });
    await storage.open(message.projectPath);
    process.kill(process.pid, "SIGKILL");
    return;
  }
  const database = new DatabaseSync(message.databasePath, { allowExtension: false, defensive: true });
  configureDatabase(database);
  const repository = createSqliteRecoveryRepository(database, {
    now: () => message.now,
    faultPoint: (point) => {
      if (point === message.faultPoint) process.kill(process.pid, "SIGKILL");
    },
  });
  if (message.mode === "claim") await repository.claimNextWithLease(message.input as Parameters<typeof repository.claimNextWithLease>[0]);
  if (message.mode === "checkpoint") await repository.saveJobCheckpoint(message.input as Parameters<typeof repository.saveJobCheckpoint>[0]);
  if (message.mode === "recover") await repository.recover(message.input as Parameters<typeof repository.recover>[0]);
  if (message.mode === "outputs") await repository.saveCompletedOutputs(message.input as Parameters<typeof repository.saveCompletedOutputs>[0]);
  database.close();
  process.send?.({ type: "unexpected-completion" });
});
