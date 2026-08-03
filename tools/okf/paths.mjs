import path from "node:path";

export function portable(root, file) {
  return path.relative(path.resolve(root), path.resolve(file)).split(path.sep).join("/");
}

export function isWithin(root, target) {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

export function isFilesystemAbsolute(value) {
  return typeof value === "string" && (
    path.isAbsolute(value) ||
    /^[A-Za-z]:[\\/]/.test(value) ||
    /^\\\\/.test(value) ||
    /^\//.test(value) ||
    /^file:/i.test(value) ||
    /^~[\\/]/.test(value)
  );
}

export function hasParentTraversal(value) {
  return typeof value === "string" && value.split(/[\\/]/).some((segment) => segment === "..");
}

export function isSafeRepositoryRelative(value) {
  return typeof value === "string" && value.length > 0 && !isFilesystemAbsolute(value) && !hasParentTraversal(value);
}

export function resolveBundlePath(bundleRoot, documentPath, raw) {
  const normalized = String(raw).replaceAll("\\", "/");
  const candidate = normalized.startsWith("/")
    ? path.resolve(bundleRoot, `.${normalized}`)
    : path.resolve(path.dirname(documentPath), normalized);
  return { candidate, inside: isWithin(bundleRoot, candidate) };
}
