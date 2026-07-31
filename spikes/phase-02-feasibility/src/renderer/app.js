(() => {
  "use strict";

  const runButton = document.querySelector("#run-button");
  const previewButton = document.querySelector("#preview-button");
  const outputButton = document.querySelector("#output-button");
  const progressList = document.querySelector("#progress-list");
  const outcome = document.querySelector("#outcome");
  const resultCard = document.querySelector("#result-card");
  const resultDetails = document.querySelector("#result-details");
  const runtimeChip = document.querySelector("#runtime-chip");

  window.__phase02AutomationState = {
    progressStages: [],
    result: null,
    error: null,
  };

  window.phase02Spike.onProgress((progress) => {
    window.__phase02AutomationState.progressStages.push(progress.stage);
    const item = document.createElement("li");
    item.innerHTML = `<strong>${progress.stage}</strong><span>${progress.message}</span>`;
    progressList.append(item);
    outcome.textContent = progress.stage;
  });

  const addDetail = (term, description) => {
    const wrapper = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = term;
    dd.textContent = description;
    wrapper.append(dt, dd);
    resultDetails.append(wrapper);
  };

  runButton.addEventListener("click", async () => {
    runButton.disabled = true;
    resultCard.hidden = true;
    progressList.replaceChildren();
    resultDetails.replaceChildren();
    outcome.textContent = "Starting";
    outcome.dataset.state = "running";
    window.__phase02AutomationState.progressStages = [];
    window.__phase02AutomationState.result = null;
    window.__phase02AutomationState.error = null;

    try {
      const result = await window.phase02Spike.run();
      window.__phase02AutomationState.result = result;
      addDetail("Run ID", result.runId);
      addDetail("Chromium", result.chromiumVersion);
      addDetail("Render time", `${result.renderDurationMs} ms`);
      addDetail("Workflow time", `${result.totalDurationMs} ms`);
      addDetail("Console errors", String(result.consoleErrorCount));
      addDetail("Failed requests", String(result.failedRequestCount));
      addDetail("Original fixture stopped", result.originalFixtureUnavailable ? "Verified" : "Not verified");
      addDetail("Offline content", result.offlineContentVisible ? "Visible" : "Missing");
      addDetail("Output", result.outputLocation);
      outcome.textContent = "Passed";
      outcome.dataset.state = "passed";
      resultCard.hidden = false;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.__phase02AutomationState.error = message;
      outcome.textContent = message;
      outcome.dataset.state = "failed";
    } finally {
      runButton.disabled = false;
    }
  });

  previewButton.addEventListener("click", () => {
    void window.phase02Spike.reopenPreview();
  });
  outputButton.addEventListener("click", () => {
    void window.phase02Spike.openOutput();
  });

  void window.phase02Spike.getRuntimeInfo().then((info) => {
    runtimeChip.textContent = info.packaged ? "Packaged spike" : "Development spike";
  });
})();

