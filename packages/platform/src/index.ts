import {
  ApplicationConfigurationSchema,
  CONTRACT_VERSION,
  PlatformInfoSchema,
  RuntimeInfoSchema,
  type ApplicationConfiguration,
  type PlatformInfo,
  type RuntimeInfo,
} from "@offline-web-archive/contracts";

const DEFAULT_CONFIGURATION: ApplicationConfiguration = Object.freeze({
  applicationName: "Offline Web Archive Builder",
  applicationVersion: "0.3.0",
  contractVersion: CONTRACT_VERSION,
  logLevel: "info",
});

export interface RuntimePlatformInfo {
  runtime: RuntimeInfo;
  platform: PlatformInfo;
}

function operatingSystem(value: NodeJS.Platform): PlatformInfo["operatingSystem"] {
  if (value === "win32") return "windows";
  if (value === "linux") return "linux";
  if (value === "darwin") return "macos";
  return "unknown";
}

function architecture(value: string): PlatformInfo["architecture"] {
  if (value === "x64" || value === "arm64" || value === "ia32") return value;
  return "unknown";
}

export function readRuntimePlatformInfo(): RuntimePlatformInfo {
  return {
    runtime: RuntimeInfoSchema.parse({
      name: "Node.js",
      version: process.versions.node,
    }),
    platform: PlatformInfoSchema.parse({
      operatingSystem: operatingSystem(process.platform),
      architecture: architecture(process.arch),
    }),
  };
}

export function resolveApplicationConfiguration(
  input: unknown = {},
): ApplicationConfiguration {
  const overrides =
    typeof input === "object" && input !== null
      ? input
      : { invalidConfigurationInput: input };
  return ApplicationConfigurationSchema.parse({
    ...DEFAULT_CONFIGURATION,
    ...overrides,
  });
}

export function readEnvironmentConfiguration(
  environment: Readonly<Record<string, string | undefined>>,
): ApplicationConfiguration {
  const logLevel = environment["OWAB_LOG_LEVEL"];
  return resolveApplicationConfiguration(
    logLevel === undefined ? {} : { logLevel },
  );
}

