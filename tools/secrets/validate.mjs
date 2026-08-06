import { readFile } from "node:fs/promises";
import path from "node:path";
import { repositoryRoot } from "../build/typescript.mjs";
import {
  AES_GCM_ALGORITHM,
  PRODUCTION_KDF_PROFILE,
  createKdfParameters,
} from "@offline-web-archive/secrets";
import {
  ENCRYPTION_ENVELOPE_VERSION,
  SECRET_REFERENCE_VERSION,
  VAULT_FORMAT_VERSION,
} from "@offline-web-archive/archive-core";

const source = await readFile(path.join(repositoryRoot, "packages", "secrets", "src", "vault.ts"), "utf8");
const errors = [];
const kdf = createKdfParameters(PRODUCTION_KDF_PROFILE);
if (AES_GCM_ALGORITHM !== "aes-256-gcm") errors.push("AES-GCM algorithm is not the approved production algorithm");
if (kdf.N !== 32_768 || kdf.r !== 8 || kdf.p !== 1) errors.push("Production KDF profile is not the approved bounded profile");
if (SECRET_REFERENCE_VERSION !== 1 || VAULT_FORMAT_VERSION !== 1 || ENCRYPTION_ENVELOPE_VERSION !== 1) errors.push("Secret format version constants are inconsistent");
for (const required of ["encryptAead", "decryptAead", "atomicWriteJson", "acquireVaultLock", "SECRET_STORE_LOCKED", "SECRET_TAMPER_DETECTED"]) {
  if (!source.includes(required)) errors.push(`Secret Store control is missing: ${required}`);
}
if (/console\.(?:log|error|warn)\s*\(/.test(source)) errors.push("Secret Store writes directly to console");
if (errors.length > 0) {
  process.stderr.write(`${errors.join("\n")}\n`);
  process.exit(1);
}
process.stdout.write(`${process.argv.includes("--diagnostics") ? "Diagnostics" : process.argv.includes("--vault") ? "Vault" : "Secret Store"} validation passed.\n`);
