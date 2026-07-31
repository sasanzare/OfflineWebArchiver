import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { repositoryRoot } from "./typescript.mjs";

const desktopRoot = path.join(repositoryRoot, "apps", "desktop");
const outputRoot = path.join(desktopRoot, "dist");
await mkdir(outputRoot, { recursive: true });

await Promise.all([
  build({
    entryPoints: [path.join(desktopRoot, "src", "main", "index.ts")],
    outfile: path.join(outputRoot, "main.cjs"),
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node24",
    external: ["electron"],
    sourcemap: true,
    logLevel: "warning",
  }),
  build({
    entryPoints: [path.join(desktopRoot, "src", "preload", "index.ts")],
    outfile: path.join(outputRoot, "preload.cjs"),
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node24",
    external: ["electron"],
    sourcemap: true,
    logLevel: "warning",
  }),
  build({
    entryPoints: [path.join(desktopRoot, "src", "renderer", "index.ts")],
    outfile: path.join(outputRoot, "renderer", "renderer.js"),
    bundle: true,
    platform: "browser",
    format: "iife",
    target: "chrome150",
    sourcemap: true,
    logLevel: "warning",
  }),
]);

const rendererOutput = path.join(outputRoot, "renderer");
await mkdir(rendererOutput, { recursive: true });
await Promise.all([
  cp(
    path.join(desktopRoot, "src", "renderer", "index.html"),
    path.join(rendererOutput, "index.html"),
  ),
  cp(
    path.join(desktopRoot, "src", "renderer", "styles.css"),
    path.join(rendererOutput, "styles.css"),
  ),
]);

await Promise.all([
  rm(path.join(outputRoot, "tsc-electron"), { recursive: true, force: true }),
  rm(path.join(outputRoot, "tsc-renderer"), { recursive: true, force: true }),
]);

process.stdout.write("Desktop main, bundled preload, and renderer built.\n");

