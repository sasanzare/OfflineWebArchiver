export function withRestrictedPath(extra = {}) {
  const env = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.toLowerCase() !== "path" && value !== undefined) env[key] = value;
  }
  const systemRoot = process.env.SystemRoot ?? process.env.SYSTEMROOT ?? "C:\\Windows";
  return {
    ...env,
    ...extra,
    Path: `${systemRoot}\\System32`,
  };
}

