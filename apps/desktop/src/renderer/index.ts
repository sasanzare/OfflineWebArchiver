import {
  createSystemDescribeCommand,
  parseResponseEnvelope,
} from "@offline-web-archive/contracts";

const button = document.querySelector<HTMLButtonElement>("#describe-button");
const status = document.querySelector<HTMLElement>("#status");
const result = document.querySelector<HTMLElement>("#result");

if (button === null || status === null || result === null) {
  throw new Error("The desktop shell is missing required local elements.");
}
const resultElement = result;

window.__architectureSmoke = {
  completed: false,
  response: null,
  error: null,
};

function addRow(term: string, value: string): void {
  const row = document.createElement("div");
  const label = document.createElement("dt");
  const description = document.createElement("dd");
  label.textContent = term;
  description.textContent = value;
  row.append(label, description);
  resultElement.append(row);
}

button.addEventListener("click", async () => {
  button.disabled = true;
  status.textContent = "Requesting the architecture description…";
  status.dataset["state"] = "running";
  resultElement.replaceChildren();
  try {
    const command = createSystemDescribeCommand({
      commandId: `command-${crypto.randomUUID()}`,
      correlationId: `correlation-${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
    });
    const response = parseResponseEnvelope(
      await window.offlineArchive.systemDescribe(command),
    );
    window.__architectureSmoke.response = response;
    if (response.status === "error") {
      status.textContent = response.error.userMessage;
      status.dataset["state"] = "failed";
      addRow("Error code", response.error.code);
    } else {
      const description = response.result;
      status.textContent = "Architecture path verified.";
      status.dataset["state"] = "passed";
      addRow("Application", `${description.applicationName} ${description.applicationVersion}`);
      addRow("Contract", description.contractVersion);
      addRow("Core status", description.coreStatus);
      addRow("Implemented", description.implementedCapabilities.join(", "));
      addRow("Planned, not implemented", description.plannedCapabilities.join(", "));
      addRow("Runtime", `${description.runtime.name} ${description.runtime.version}`);
      addRow("Platform", `${description.platform.operatingSystem} ${description.platform.architecture}`);
      addRow("Correlation ID", response.correlationId);
    }
  } catch {
    const message = "The architecture description could not be loaded.";
    status.textContent = message;
    status.dataset["state"] = "failed";
    window.__architectureSmoke.error = message;
  } finally {
    window.__architectureSmoke.completed = true;
    button.disabled = false;
  }
});
