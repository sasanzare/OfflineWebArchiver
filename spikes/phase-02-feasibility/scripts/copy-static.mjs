import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const spikeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(spikeRoot, "src", "renderer");
const destination = path.join(spikeRoot, "build", "src", "renderer");

await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true, force: true });
process.stdout.write("Copied renderer assets to build/src/renderer.\n");

