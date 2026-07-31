import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { SpikeError } from "./errors.js";

export function toPortablePath(value: string): string {
  return value.split(path.sep).join("/");
}

export function isWithinRoot(root: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

export function assertWithinRoot(root: string, candidate: string): void {
  if (!isWithinRoot(root, candidate)) {
    throw new SpikeError(
      "SPIKE_CONFIGURATION_ERROR",
      "Resolved path is outside the allowed spike root.",
      { recoverable: false },
    );
  }
}

export function createRunId(now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `p02-${stamp}-${randomBytes(6).toString("hex")}`;
}

export function resolveBrowserRoot(options: {
  packaged: boolean;
  resourcesPath: string;
  spikeRoot: string;
}): string {
  return options.packaged
    ? path.join(options.resourcesPath, "playwright-browsers")
    : path.join(options.spikeRoot, ".playwright-browsers");
}

export function resolveFixtureRoot(options: {
  packaged: boolean;
  resourcesPath: string;
  spikeRoot: string;
}): string {
  return options.packaged
    ? path.join(options.resourcesPath, "phase-02-fixture")
    : path.join(options.spikeRoot, "fixtures", "spa");
}

export function assertBrowserExecutable(
  browserRoot: string,
  executablePath: string,
): void {
  if (!isWithinRoot(browserRoot, executablePath) || !existsSync(executablePath)) {
    throw new SpikeError(
      "SPIKE_BROWSER_NOT_FOUND",
      "The Playwright Chromium executable is missing from the configured bundled browser directory. Run the explicit browser installation command before launch.",
    );
  }
}

export function describeBrowserExecutable(
  browserRoot: string,
  executablePath: string,
  packaged: boolean,
): string {
  assertBrowserExecutable(browserRoot, executablePath);
  const relative = toPortablePath(path.relative(browserRoot, executablePath));
  return packaged
    ? `resources/playwright-browsers/${relative}`
    : `.playwright-browsers/${relative}`;
}

