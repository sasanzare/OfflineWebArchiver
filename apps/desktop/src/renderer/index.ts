import { createProjectCommand, parseResponseEnvelope, type ResponseEnvelope } from "@offline-web-archive/contracts";

const status = document.querySelector<HTMLElement>("#status");
const result = document.querySelector<HTMLElement>("#result");
const nameInput = document.querySelector<HTMLInputElement>("#project-name");
const slugInput = document.querySelector<HTMLInputElement>("#project-slug");
const buttons = [...document.querySelectorAll<HTMLButtonElement>("button[data-action]")];

if (status === null || result === null || nameInput === null || slugInput === null) {
  throw new Error("The desktop Project shell is missing required local elements.");
}
const statusElement = status;
const resultElement = result;
const projectNameInput = nameInput;
const projectSlugInput = slugInput;

let selectedProjectPath: string | null = null;

function metadata() {
  return {
    commandId: `command-${crypto.randomUUID()}`,
    correlationId: `correlation-${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
  };
}

function addRow(term: string, value: string): void {
  const row = document.createElement("div");
  const label = document.createElement("dt");
  const description = document.createElement("dd");
  label.textContent = term;
  description.textContent = value;
  row.append(label, description);
  resultElement.append(row);
}

function renderResponse(response: ResponseEnvelope): void {
  resultElement.replaceChildren();
  if (response.status === "error") {
    statusElement.textContent = response.error.userMessage;
    statusElement.dataset["state"] = "failed";
    addRow("Error", response.error.code);
    return;
  }
  statusElement.dataset["state"] = "passed";
  const value = response.result;
  if (value.resultType === "project.summary") {
    selectedProjectPath = value.project.projectPath;
    statusElement.textContent = `${value.project.name} is ${value.project.state}.`;
    addRow("Project ID", value.project.projectId);
    addRow("Location", value.project.projectPath);
    addRow("Format", value.project.formatVersion);
    addRow("Database schema", String(value.project.schemaVersion));
    addRow("Migration", value.project.migrationStatus);
    return;
  }
  if (value.resultType === "project.validation") {
    statusElement.textContent = value.report.valid ? "Project validation passed." : "Project validation failed.";
    statusElement.dataset["state"] = value.report.valid ? "passed" : "failed";
    addRow("Compatible", String(value.report.compatibility.compatible));
    addRow("Issues", String(value.report.issues.length));
    value.report.issues.forEach((entry) => addRow(entry.code, entry.message));
    return;
  }
  if (value.resultType === "project.export") {
    statusElement.textContent = "Project export completed.";
    addRow("Archive", value.export.archivePath);
    addRow("SHA-256", value.export.sha256);
    return;
  }
  if (value.resultType === "project.import") {
    selectedProjectPath = value.import.project.projectPath;
    statusElement.textContent = "Project import completed.";
    addRow("Project ID", value.import.project.projectId);
    addRow("Location", value.import.project.projectPath);
  }
}

async function execute(commandType: Parameters<typeof createProjectCommand>[0], payload: unknown): Promise<ResponseEnvelope> {
  return parseResponseEnvelope(await window.offlineArchive.execute(createProjectCommand(commandType, payload, metadata())));
}

async function perform(action: string): Promise<void> {
  buttons.forEach((button) => { button.disabled = true; });
  statusElement.textContent = "Working…";
  statusElement.dataset["state"] = "running";
  try {
    let response: ResponseEnvelope | null = null;
    if (action === "create") {
      const destinationPath = await window.offlineArchive.selectPath("project-create");
      if (destinationPath !== null) response = await execute("project.create", { destinationPath, name: projectNameInput.value, slug: projectSlugInput.value });
    } else if (action === "open") {
      const projectPath = await window.offlineArchive.selectPath("project-open");
      if (projectPath !== null) response = await execute("project.open", { projectPath });
    } else if (action === "validate") {
      const projectPath = selectedProjectPath ?? await window.offlineArchive.selectPath("project-open");
      if (projectPath !== null) response = await execute("project.validate", { projectPath });
    } else if (action === "export" && selectedProjectPath !== null) {
      const archivePath = await window.offlineArchive.selectPath("archive-save");
      if (archivePath !== null) response = await execute("project.export", { projectPath: selectedProjectPath, archivePath });
    } else if (action === "import") {
      const archivePath = await window.offlineArchive.selectPath("archive-open");
      const destinationPath = archivePath === null ? null : await window.offlineArchive.selectPath("import-destination");
      if (archivePath !== null && destinationPath !== null) response = await execute("project.import", { archivePath, destinationPath });
    } else if (action === "close") {
      response = await execute("project.close", {});
    }
    if (response === null) {
      statusElement.textContent = "Operation cancelled or no open Project is available.";
      statusElement.dataset["state"] = "";
    } else {
      renderResponse(response);
    }
  } catch {
    statusElement.textContent = "The Project operation could not be completed safely.";
    statusElement.dataset["state"] = "failed";
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
  }
}

buttons.forEach((button) => button.addEventListener("click", () => void perform(button.dataset["action"] ?? "")));
