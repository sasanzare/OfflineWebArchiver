import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

interface CommandOptions {
  cwd: string;
  env: Record<string, string>;
  windowsHide: boolean;
}

interface PortableCommand {
  command: string;
  args: string[];
  options: CommandOptions;
}

interface ResolvePortableCommand {
  (kind: "node" | "npm", args?: string[], context?: {
    platform?: string;
    execPath?: string;
    cwd?: string;
    env?: Record<string, string>;
  }): PortableCommand;
}

async function load<T>(relativePath: string): Promise<T> {
  return await import(pathToFileURL(path.resolve(relativePath)).href) as T;
}

const { resolvePortableCommand } = await load<{ resolvePortableCommand: ResolvePortableCommand }>("tools/testing/run-phase13-evidence.mjs");

test("plans POSIX Node execution with one argument per value", () => {
  const command = resolvePortableCommand("node", ["tools/testing/run-tests.mjs", "package:browser-runtime"], {
    platform: "linux",
    execPath: "/usr/local/bin/node",
    cwd: "/workspace/Offline Web Archiver",
    env: { PATH: "/usr/bin", ComSpec: "preserve-this", TMPDIR: "/tmp" },
  });

  assert.equal(command.command, "/usr/local/bin/node");
  assert.deepEqual(command.args, ["tools/testing/run-tests.mjs", "package:browser-runtime"]);
  assert.equal(command.options.cwd, "/workspace/Offline Web Archiver");
  assert.equal(command.options.env["ComSpec"], "preserve-this");
  assert.equal(command.options.windowsHide, false);
  assert.equal(Object.hasOwn(command.options, "shell"), false);
});

test("plans Windows Node execution without quoting paths or arguments", () => {
  const command = resolvePortableCommand("node", ["tools/testing/run-tests.mjs", "--output-dir", "D:\\Evidence Bundles\\Windows 11"], {
    platform: "win32",
    execPath: "C:\\Program Files\\nodejs\\node.exe",
    cwd: "D:\\All projects\\OfflineWebArchiver",
    env: { PATH: "C:\\Windows\\System32", ComSpec: "C:\\Windows\\System32\\cmd.exe", SystemRoot: "C:\\Windows" },
  });

  assert.equal(command.command, "C:\\Program Files\\nodejs\\node.exe");
  assert.deepEqual(command.args, ["tools/testing/run-tests.mjs", "--output-dir", "D:\\Evidence Bundles\\Windows 11"]);
  assert.equal(command.options.cwd, "D:\\All projects\\OfflineWebArchiver");
  assert.equal(command.options.env["SystemRoot"], "C:\\Windows");
  assert.equal(command.options.windowsHide, true);
  assert.ok(command.args.every((value) => !value.startsWith('"') && !value.endsWith('"')));
});

test("plans POSIX npm through its JavaScript CLI when npm_execpath is available", () => {
  const npmExecPath = "/opt/node/lib/node_modules/npm/bin/npm-cli.js";
  const command = resolvePortableCommand("npm", ["run", "browser:verify"], {
    platform: "darwin",
    execPath: "/opt/node/bin/node",
    env: { npm_execpath: npmExecPath, PATH: "/usr/bin" },
  });

  assert.equal(command.command, "/opt/node/bin/node");
  assert.deepEqual(command.args, [npmExecPath, "run", "browser:verify"]);
  assert.equal(command.options.env["npm_execpath"], npmExecPath);
  assert.equal(command.command.endsWith(".cmd"), false);
});

test("keeps POSIX npm execution direct when npm_execpath is unavailable", () => {
  const command = resolvePortableCommand("npm", ["--version"], {
    platform: "linux",
    execPath: "/usr/local/bin/node",
    env: { PATH: "/usr/bin" },
  });

  assert.equal(command.command, "npm");
  assert.deepEqual(command.args, ["--version"]);
  assert.equal(command.options.windowsHide, false);
});

test("plans Windows npm through npm_execpath instead of npm.cmd", () => {
  const npmExecPath = "C:\\Users\\runner\\AppData\\Roaming\\npm\\node_modules\\npm\\bin\\npm-cli.js";
  const command = resolvePortableCommand("npm", ["run", "test", "--", "--output-dir", "D:\\Evidence Bundles"], {
    platform: "win32",
    execPath: "C:\\Program Files\\nodejs\\node.exe",
    cwd: "D:\\All projects\\OfflineWebArchiver",
    env: { npm_execpath: npmExecPath, PATH: "C:\\Windows\\System32", ComSpec: "C:\\Windows\\System32\\cmd.exe" },
  });

  assert.equal(command.command, "C:\\Program Files\\nodejs\\node.exe");
  assert.deepEqual(command.args, [npmExecPath, "run", "test", "--", "--output-dir", "D:\\Evidence Bundles"]);
  assert.equal(command.command.toLowerCase().endsWith(".cmd"), false);
  assert.equal(command.options.env["ComSpec"], "C:\\Windows\\System32\\cmd.exe");
  assert.equal(command.options.windowsHide, true);
});

test("derives the Windows npm CLI path for direct node invocation", () => {
  const command = resolvePortableCommand("npm", ["--version"], {
    platform: "win32",
    execPath: "C:\\Program Files\\nodejs\\node.exe",
    env: { PATH: "C:\\Windows\\System32" },
  });

  assert.equal(command.command, "C:\\Program Files\\nodejs\\node.exe");
  assert.deepEqual(command.args, ["C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js", "--version"]);
});
