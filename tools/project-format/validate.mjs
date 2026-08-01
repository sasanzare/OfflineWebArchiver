import {
  createProjectManifest,
  parseProjectManifest,
  serializeProjectManifest,
  validatePortableRelativePath,
} from "@offline-web-archive/project-format";

const manifest = createProjectManifest({
  applicationVersion: "0.7.0",
  projectId: "00000000-0000-4000-8000-000000000001",
  name: "Format validation",
  slug: "format-validation",
  createdAt: "2026-07-31T12:00:00.000Z",
  revisionId: "00000000-0000-4000-8000-000000000002",
  runId: "00000000-0000-4000-8000-000000000003",
});
parseProjectManifest(JSON.parse(serializeProjectManifest(manifest)));
const unsafe = ["../escape", "/absolute", "C:/drive", "folder\\file", "CON", "a//b", "trailing. "];
if (unsafe.some((value) => validatePortableRelativePath(value).valid)) {
  throw new Error("Portable path negative validation failed");
}
process.stdout.write(`Project format ${manifest.format.version} and ${unsafe.length} unsafe path probes passed.\n`);
