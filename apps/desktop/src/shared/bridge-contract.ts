export const SELECTION_PURPOSES = Object.freeze([
  "project-create",
  "project-open",
  "archive-open",
  "archive-save",
  "import-destination",
] as const);

export type SelectionPurpose = (typeof SELECTION_PURPOSES)[number];

export function isSelectionPurpose(value: unknown): value is SelectionPurpose {
  return typeof value === "string" &&
    (SELECTION_PURPOSES as readonly string[]).includes(value);
}
