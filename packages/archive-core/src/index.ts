export const IMPLEMENTED_CORE_CAPABILITIES = ["system.describe"] as const;

export const PLANNED_CORE_CAPABILITIES = [
  "project.persistence",
  "crawl.execution",
  "browser.rendering",
  "archive.generation",
  "authentication",
  "proxy.management",
] as const;

export interface CoreSystemDescription {
  coreStatus: "architecture-ready";
  implementedCapabilities: readonly ["system.describe"];
  plannedCapabilities: readonly string[];
}

export interface ArchiveCore {
  describeSystem(): CoreSystemDescription;
}

export function createArchiveCore(): ArchiveCore {
  return Object.freeze({
    describeSystem(): CoreSystemDescription {
      return {
        coreStatus: "architecture-ready",
        implementedCapabilities: IMPLEMENTED_CORE_CAPABILITIES,
        plannedCapabilities: PLANNED_CORE_CAPABILITIES,
      };
    },
  });
}

