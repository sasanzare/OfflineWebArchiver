import "./typescript.mjs";
import { runTypeScriptBuild } from "./typescript.mjs";

runTypeScriptBuild();
await import("./build-desktop.mjs");
process.stdout.write("Production workspace build completed.\n");

