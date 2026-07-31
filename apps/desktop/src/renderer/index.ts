import { createProjectCommand, parseResponseEnvelope, type PageJobContract, type ResponseEnvelope, type SiteProfileContract } from "@offline-web-archive/contracts";

const status = document.querySelector<HTMLElement>("#status");
const result = document.querySelector<HTMLElement>("#result");
const nameInput = document.querySelector<HTMLInputElement>("#project-name");
const slugInput = document.querySelector<HTMLInputElement>("#project-slug");
const profileNameInput = document.querySelector<HTMLInputElement>("#profile-name");
const profileSeedInput = document.querySelector<HTMLInputElement>("#profile-seed");
const profileBaseUrlInput = document.querySelector<HTMLInputElement>("#profile-base-url");
const profileDomainAllowInput = document.querySelector<HTMLTextAreaElement>("#profile-domain-allow");
const profileDomainDenyInput = document.querySelector<HTMLTextAreaElement>("#profile-domain-deny");
const profilePathAllowInput = document.querySelector<HTMLTextAreaElement>("#profile-path-allow");
const profilePathDenyInput = document.querySelector<HTMLTextAreaElement>("#profile-path-deny");
const profileQueryPolicyInput = document.querySelector<HTMLTextAreaElement>("#profile-query-policy");
const profileFragmentPolicyInput = document.querySelector<HTMLSelectElement>("#profile-fragment-policy");
const profileCanonicalExternalInput = document.querySelector<HTMLSelectElement>("#profile-canonical-external");
const profileRedirectExternalInput = document.querySelector<HTMLInputElement>("#profile-redirect-external");
const profileRedirectDowngradeInput = document.querySelector<HTMLInputElement>("#profile-redirect-downgrade");
const profileMaxDepthInput = document.querySelector<HTMLInputElement>("#profile-max-depth");
const profileMaxPagesInput = document.querySelector<HTMLInputElement>("#profile-max-pages");
const profileCompareFromInput = document.querySelector<HTMLInputElement>("#profile-compare-from");
const profileCompareToInput = document.querySelector<HTMLInputElement>("#profile-compare-to");
const profileRevisionSummary = document.querySelector<HTMLElement>("#profile-revision-summary");
const scopeUrlInput = document.querySelector<HTMLInputElement>("#scope-url");
const queueUrlInput = document.querySelector<HTMLInputElement>("#queue-url");
const queueStateFilter = document.querySelector<HTMLSelectElement>("#queue-state-filter");
const queuePageSize = document.querySelector<HTMLInputElement>("#queue-page-size");
const queueSummary = document.querySelector<HTMLElement>("#queue-summary");
const queueList = document.querySelector<HTMLElement>("#queue-list");
const queueDetail = document.querySelector<HTMLElement>("#queue-detail");
const buttons = [...document.querySelectorAll<HTMLButtonElement>("button[data-action]")];

if (status === null || result === null || nameInput === null || slugInput === null || profileNameInput === null || profileSeedInput === null || profileBaseUrlInput === null || profileDomainAllowInput === null || profileDomainDenyInput === null || profilePathAllowInput === null || profilePathDenyInput === null || profileQueryPolicyInput === null || profileFragmentPolicyInput === null || profileCanonicalExternalInput === null || profileRedirectExternalInput === null || profileRedirectDowngradeInput === null || profileMaxDepthInput === null || profileMaxPagesInput === null || profileCompareFromInput === null || profileCompareToInput === null || profileRevisionSummary === null || scopeUrlInput === null || queueUrlInput === null || queueStateFilter === null || queuePageSize === null || queueSummary === null || queueList === null || queueDetail === null) {
  throw new Error("The desktop Project shell is missing required local elements.");
}
const statusElement = status;
const resultElement = result;
const projectNameInput = nameInput;
const projectSlugInput = slugInput;
const siteProfileNameInput = profileNameInput;
const siteProfileSeedInput = profileSeedInput;
const siteProfileBaseUrlInput = profileBaseUrlInput;
const siteProfileDomainAllowInput = profileDomainAllowInput;
const siteProfileDomainDenyInput = profileDomainDenyInput;
const siteProfilePathAllowInput = profilePathAllowInput;
const siteProfilePathDenyInput = profilePathDenyInput;
const siteProfileQueryPolicyInput = profileQueryPolicyInput;
const siteProfileFragmentPolicyInput = profileFragmentPolicyInput;
const siteProfileCanonicalExternalInput = profileCanonicalExternalInput;
const siteProfileRedirectExternalInput = profileRedirectExternalInput;
const siteProfileRedirectDowngradeInput = profileRedirectDowngradeInput;
const siteProfileMaxDepthInput = profileMaxDepthInput;
const siteProfileMaxPagesInput = profileMaxPagesInput;
const siteProfileCompareFromInput = profileCompareFromInput;
const siteProfileCompareToInput = profileCompareToInput;
const siteProfileRevisionSummary = profileRevisionSummary;
const scopePreviewUrlInput = scopeUrlInput;
const queueTestUrlInput = queueUrlInput;
const queueStateFilterInput = queueStateFilter;
const queuePageSizeInput = queuePageSize;
const queueSummaryElement = queueSummary;
const queueListElement = queueList;
const queueDetailElement = queueDetail;

let selectedProjectPath: string | null = null;
let selectedRunId: string | null = null;
let loadedProfile: SiteProfileContract | null = null;
let selectedQueueJob: PageJobContract | null = null;
let queueNextCursor: number | null = null;

class ProfileEditorError extends Error {}

function parseJson<T>(input: HTMLTextAreaElement, label: string, requireArray: boolean): T {
  try {
    const value = JSON.parse(input.value) as unknown;
    if (requireArray && !Array.isArray(value)) throw new ProfileEditorError(`${label} must be a JSON array.`);
    if (!requireArray && (typeof value !== "object" || value === null || Array.isArray(value))) throw new ProfileEditorError(`${label} must be a JSON object.`);
    return value as T;
  } catch (error) {
    if (error instanceof ProfileEditorError) throw error;
    throw new ProfileEditorError(`${label} contains invalid JSON.`);
  }
}

function boundedNumber(input: HTMLInputElement, label: string): number | null {
  if (input.value.trim() === "") return null;
  const value = Number(input.value);
  if (!Number.isInteger(value) || value < 0) throw new ProfileEditorError(`${label} must be a non-negative whole number or blank.`);
  return value;
}

function populateProfileEditor(profile: SiteProfileContract): void {
  siteProfileNameInput.value = profile.name;
  siteProfileSeedInput.value = profile.seedUrls[0] ?? profile.baseUrl;
  siteProfileBaseUrlInput.value = profile.baseUrl;
  siteProfileDomainAllowInput.value = JSON.stringify(profile.domainRules.filter((rule) => rule.effect === "allow"), null, 2);
  siteProfileDomainDenyInput.value = JSON.stringify(profile.domainRules.filter((rule) => rule.effect === "deny"), null, 2);
  siteProfilePathAllowInput.value = JSON.stringify(profile.pathRules.filter((rule) => rule.effect === "allow"), null, 2);
  siteProfilePathDenyInput.value = JSON.stringify(profile.pathRules.filter((rule) => rule.effect === "deny"), null, 2);
  siteProfileQueryPolicyInput.value = JSON.stringify(profile.queryPolicy, null, 2);
  siteProfileFragmentPolicyInput.value = profile.fragmentPolicy;
  siteProfileCanonicalExternalInput.value = profile.canonicalPolicy.external;
  siteProfileRedirectExternalInput.checked = profile.redirectPolicy.allowApprovedExternal;
  siteProfileRedirectDowngradeInput.checked = profile.redirectPolicy.allowHttpsDowngrade;
  siteProfileMaxDepthInput.value = profile.limits.maxDepth === null ? "" : String(profile.limits.maxDepth);
  siteProfileMaxPagesInput.value = profile.limits.maxPages === null ? "" : String(profile.limits.maxPages);
  siteProfileCompareFromInput.value = String(Math.max(1, profile.sequence - 1));
  siteProfileCompareToInput.value = String(profile.sequence);
  siteProfileRevisionSummary.textContent = `Revision ${profile.sequence}: ${profile.revisionId}; engine ${profile.engineVersion}; schema ${profile.schemaVersion}.`;
}

function editorDraft(profile: SiteProfileContract) {
  type DomainRule = SiteProfileContract["domainRules"][number];
  type PathRule = SiteProfileContract["pathRules"][number];
  const allowedDomains = parseJson<DomainRule[]>(siteProfileDomainAllowInput, "Allowed domains", true).map((rule) => ({ ...rule, effect: "allow" as const }));
  const deniedDomains = parseJson<DomainRule[]>(siteProfileDomainDenyInput, "Denied domains", true).map((rule) => ({ ...rule, effect: "deny" as const }));
  const allowedPaths = parseJson<PathRule[]>(siteProfilePathAllowInput, "Allowed paths", true).map((rule) => ({ ...rule, effect: "allow" as const }));
  const deniedPaths = parseJson<PathRule[]>(siteProfilePathDenyInput, "Denied paths", true).map((rule) => ({ ...rule, effect: "deny" as const }));
  const queryPolicy = parseJson<SiteProfileContract["queryPolicy"]>(siteProfileQueryPolicyInput, "Query policy", false);
  const { schemaVersion: _schemaVersion, engineVersion: _engineVersion, profileId: _profileId, projectId: _projectId, revisionId: _revisionId, sequence: _sequence, createdAt: _createdAt, updatedAt: _updatedAt, ...draft } = profile;
  return {
    ...draft,
    name: siteProfileNameInput.value,
    baseUrl: siteProfileBaseUrlInput.value,
    seedUrls: [siteProfileSeedInput.value],
    domainRules: [...allowedDomains, ...deniedDomains],
    pathRules: [...allowedPaths, ...deniedPaths],
    queryPolicy,
    fragmentPolicy: siteProfileFragmentPolicyInput.value as SiteProfileContract["fragmentPolicy"],
    canonicalPolicy: { external: siteProfileCanonicalExternalInput.value as SiteProfileContract["canonicalPolicy"]["external"] },
    redirectPolicy: { allowApprovedExternal: siteProfileRedirectExternalInput.checked, allowHttpsDowngrade: siteProfileRedirectDowngradeInput.checked },
    limits: { ...draft.limits, maxDepth: boundedNumber(siteProfileMaxDepthInput, "Max Depth"), maxPages: boundedNumber(siteProfileMaxPagesInput, "Max Pages") },
  };
}

function metadata() {
  return {
    commandId: `command-${crypto.randomUUID()}`,
    correlationId: `correlation-${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
  };
}

function addRow(term: string, value: string): void {
  addDefinitionRow(resultElement, term, value);
}

function addDefinitionRow(container: HTMLElement, term: string, value: string): void {
  const row = document.createElement("div");
  const label = document.createElement("dt");
  const description = document.createElement("dd");
  label.textContent = term;
  description.textContent = value;
  row.append(label, description);
  container.append(row);
}

function renderQueueJob(job: PageJobContract): void {
  selectedQueueJob = job;
  queueDetailElement.replaceChildren();
  addDefinitionRow(queueDetailElement, "Job ID", job.jobId);
  addDefinitionRow(queueDetailElement, "State", job.state);
  addDefinitionRow(queueDetailElement, "Safe URL", job.safeDisplayUrl);
  addDefinitionRow(queueDetailElement, "Identity hash", job.identityHash);
  addDefinitionRow(queueDetailElement, "Priority", `${job.priority} (${job.prioritySource})`);
  addDefinitionRow(queueDetailElement, "Depth", String(job.depth));
  addDefinitionRow(queueDetailElement, "Attempts", `${job.attemptCount}/${job.maxAttempts}`);
  addDefinitionRow(queueDetailElement, "Next eligible", job.nextEligibleAt);
}

function renderQueueList(jobs: readonly PageJobContract[], nextCursor: number | null): void {
  queueNextCursor = nextCursor;
  queueListElement.replaceChildren();
  if (jobs.length === 0) {
    queueListElement.textContent = "No Jobs match the selected queue filter.";
    return;
  }
  for (const job of jobs) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset["jobId"] = job.jobId;
    button.setAttribute("role", "listitem");
    button.textContent = `#${job.queueSequence} ${job.state} | priority ${job.priority} | depth ${job.depth} | attempts ${job.attemptCount}/${job.maxAttempts} | ${job.safeDisplayUrl}`;
    queueListElement.append(button);
  }
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
    selectedRunId = value.project.runId;
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
    return;
  }
  if (value.resultType === "profile.value") {
    loadedProfile = value.profile;
    populateProfileEditor(value.profile);
    statusElement.textContent = `Site Profile revision ${value.profile.sequence} is available.`;
    addRow("Profile", value.profile.name);
    addRow("Profile ID", value.profile.profileId);
    addRow("Revision", value.profile.revisionId);
    addRow("Authorization", value.profile.authorization.status);
    addRow("Base URL", value.profile.baseUrl);
    addRow("Seeds", value.profile.seedUrls.join(", "));
    if (value.changedPaths !== undefined) addRow("Changed policy paths", value.changedPaths.join(", "));
    return;
  }
  if (value.resultType === "profile.validation") {
    statusElement.textContent = value.validation.valid ? "Site Profile validation passed." : "Site Profile validation failed.";
    statusElement.dataset["state"] = value.validation.valid ? "passed" : "failed";
    value.validation.errors.forEach((entry) => addRow(entry.code, entry.message));
    value.validation.warnings.forEach((entry) => addRow(entry.code, entry.message));
    return;
  }
  if (value.resultType === "profile.comparison") {
    statusElement.textContent = "Site Profile revisions compared.";
    addRow("From", value.comparison.fromRevisionId);
    addRow("To", value.comparison.toRevisionId);
    addRow("Changed policy paths", value.comparison.changedPaths.join(", ") || "None");
    return;
  }
  if (value.resultType === "scope.decision") {
    statusElement.textContent = value.decision.eligible ? "The URL is in scope." : "The URL is out of scope.";
    statusElement.dataset["state"] = value.decision.eligible ? "passed" : "failed";
    addRow("Normalized URL", value.decision.displayUrl ?? "Unavailable");
    addRow("Identity hash", value.decision.identityHash ?? "Unavailable");
    addRow("Queue eligible", String(value.decision.shouldQueue));
    addRow("Host class", value.decision.security.hostClass);
    addRow("Reasons", value.decision.reasonCodes.join(", "));
    addRow("Matched rules", value.decision.matchedRules.map((rule) => `${rule.ruleType}:${rule.ruleId}:${rule.ruleAction}:${rule.ruleMatch}`).join(", ") || "None");
    return;
  }
  if (value.resultType === "queue.enqueue") {
    const enqueue = value.enqueue;
    statusElement.textContent = enqueue.outcome === "existing" ? "The URL maps to an existing logical Job; alternate discovery evidence was retained." : enqueue.outcome === "created" ? "A new Page Job was enqueued for controlled testing." : `The URL was ${enqueue.outcome}; no Page Job was created.`;
    addRow("Outcome", enqueue.outcome);
    if (enqueue.job !== null) {
      renderQueueJob(enqueue.job);
      addRow("Job ID", enqueue.job.jobId);
      addRow("Identity hash", enqueue.job.identityHash);
    } else if ("reasonCodes" in enqueue) addRow("Reasons", enqueue.reasonCodes.join(", "));
    else addRow("Error", enqueue.errorCode);
    return;
  }
  if (value.resultType === "queue.batch") {
    statusElement.textContent = `Queue batch completed for ${value.items.length} items.`;
    for (const [name, count] of Object.entries(value.counts)) addRow(name, String(count));
    return;
  }
  if (value.resultType === "queue.job") {
    statusElement.textContent = value.job === null ? "No eligible Page Job is available." : `Queue ${value.action} left the Job in ${value.job.state}.`;
    if (value.job !== null) renderQueueJob(value.job);
    return;
  }
  if (value.resultType === "queue.released") {
    statusElement.textContent = `Released ${value.jobs.length} due retry Job(s).`;
    return;
  }
  if (value.resultType === "queue.list") {
    statusElement.textContent = `Loaded ${value.jobs.length} Page Job(s).`;
    renderQueueList(value.jobs, value.nextCursor);
    return;
  }
  if (value.resultType === "queue.statistics") {
    statusElement.textContent = "Queue statistics loaded; these values are not archive coverage.";
    queueSummaryElement.replaceChildren();
    for (const [name, count] of Object.entries(value.statistics)) addDefinitionRow(queueSummaryElement, name, count === null ? "None" : String(count));
    return;
  }
  if (value.resultType === "queue.history") {
    renderQueueJob(value.history.job);
    addDefinitionRow(queueDetailElement, "Transitions", value.history.transitions.map((entry) => `${entry.fromState ?? "created"} -> ${entry.toState} (${entry.reasonCode})`).join("; ") || "None");
    addDefinitionRow(queueDetailElement, "Attempts", value.history.attempts.map((entry) => `#${entry.attemptNumber} ${entry.outcome}`).join("; ") || "None");
    addDefinitionRow(queueDetailElement, "Discoveries", value.history.discoveries.map((entry) => `${entry.discoveryType} depth ${entry.resultDepth} parent ${entry.parentJobId ?? "root"}`).join("; ") || "None");
    statusElement.textContent = "Job detail and durable history loaded.";
    return;
  }
  if (value.resultType === "queue.clear") {
    statusElement.textContent = `Skipped ${value.skipped} pending Job(s); history was retained.`;
  }
}

async function execute(commandType: Parameters<typeof createProjectCommand>[0], payload: unknown): Promise<ResponseEnvelope> {
  const commandMetadata = metadata();
  const queueMutations = new Set(["queue.enqueue", "queue.enqueueBatch", "queue.claimNext", "queue.complete", "queue.fail", "queue.scheduleRetry", "queue.releaseDueRetries", "queue.skip", "queue.block", "queue.clearPending"]);
  const commandPayload = queueMutations.has(commandType) && typeof payload === "object" && payload !== null
    ? { ...(payload as Record<string, unknown>), operationId: commandMetadata.commandId }
    : payload;
  return parseResponseEnvelope(await window.offlineArchive.execute(createProjectCommand(commandType, commandPayload, commandMetadata)));
}

function queueContext(): { projectPath: string; runId: string } {
  if (selectedProjectPath === null || selectedRunId === null) throw new ProfileEditorError("Open a Project before using the queue controls.");
  return { projectPath: selectedProjectPath, runId: selectedRunId };
}

async function loadQueuePage(afterSequence?: number): Promise<ResponseEnvelope> {
  const limit = boundedNumber(queuePageSizeInput, "Queue page size");
  if (limit === null || limit < 1 || limit > 200) throw new ProfileEditorError("Queue page size must be from 1 to 200.");
  const state = queueStateFilterInput.value;
  return execute("queue.list", { ...queueContext(), limit, ...(state === "" ? {} : { state }), ...(afterSequence === undefined ? {} : { afterSequence }) });
}

async function loadQueueJob(jobId: string): Promise<void> {
  const job = await execute("queue.get", { ...queueContext(), jobId });
  renderResponse(job);
  const history = await execute("queue.getHistory", { ...queueContext(), jobId });
  renderResponse(history);
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
    } else if (action === "profile-create" && selectedProjectPath !== null) {
      response = await execute("profile.create", { projectPath: selectedProjectPath, name: siteProfileNameInput.value, seedUrl: siteProfileSeedInput.value });
    } else if (action === "profile-show" && selectedProjectPath !== null) {
      response = await execute("profile.get", { projectPath: selectedProjectPath });
    } else if (action === "profile-validate" && selectedProjectPath !== null) {
      response = await execute("profile.validate", { projectPath: selectedProjectPath });
    } else if (action === "profile-update" && selectedProjectPath !== null && loadedProfile !== null) {
      if (siteProfileBaseUrlInput.value !== loadedProfile.baseUrl && !window.confirm("Changing Base URL creates a new immutable Profile and Project revision. Continue?")) {
        statusElement.textContent = "Base URL change cancelled.";
        statusElement.dataset["state"] = "";
        return;
      } else {
        response = await execute("profile.update", { projectPath: selectedProjectPath, expectedRevisionId: loadedProfile.revisionId, draft: editorDraft(loadedProfile) });
      }
    } else if (action === "profile-compare" && selectedProjectPath !== null) {
      response = await execute("profile.compare", { projectPath: selectedProjectPath, fromSequence: Number(siteProfileCompareFromInput.value), toSequence: Number(siteProfileCompareToInput.value) });
    } else if (action.startsWith("scope-") && selectedProjectPath !== null) {
      const operation = action === "scope-evaluate" ? "scope.evaluate" : action === "scope-explain" ? "scope.explain" : "scope.previewNormalization";
      response = await execute(operation, { projectPath: selectedProjectPath, input: { url: scopePreviewUrlInput.value } });
    } else if (action === "queue-enqueue") {
      if (loadedProfile === null) throw new ProfileEditorError("Load the current Site Profile before enqueueing a test URL.");
      response = await execute("queue.enqueue", { ...queueContext(), profileRevision: loadedProfile.revisionId, url: queueTestUrlInput.value, discoveryType: "manual", maxAttempts: 3, idempotencyKey: `desktop-enqueue-${crypto.randomUUID()}` });
    } else if (action === "queue-refresh") {
      renderResponse(await execute("queue.getStatistics", queueContext()));
      response = await loadQueuePage();
    } else if (action === "queue-next") {
      response = await loadQueuePage(queueNextCursor ?? undefined);
    } else if (action === "queue-claim") {
      response = await execute("queue.claimNext", { ...queueContext(), claimedBy: "desktop-controlled-test", idempotencyKey: `desktop-claim-${crypto.randomUUID()}` });
    } else if (action === "queue-complete") {
      if (selectedQueueJob?.state !== "processing" || selectedQueueJob.claimToken === null) throw new ProfileEditorError("Select a processing Job owned by the current controlled test before completing it.");
      response = await execute("queue.complete", { ...queueContext(), jobId: selectedQueueJob.jobId, claimToken: selectedQueueJob.claimToken, completionKey: `desktop-completion-${crypto.randomUUID()}`, resultSummary: { resultType: "queue-test", statusCode: null, contentStored: false }, completedAt: new Date().toISOString(), idempotencyKey: `desktop-complete-${crypto.randomUUID()}` });
    } else if (action === "queue-fail") {
      if (selectedQueueJob?.state !== "processing" || selectedQueueJob.claimToken === null) throw new ProfileEditorError("Select a processing Job owned by the current controlled test before failing it.");
      response = await execute("queue.fail", { ...queueContext(), jobId: selectedQueueJob.jobId, claimToken: selectedQueueJob.claimToken, failureKey: `desktop-failure-${crypto.randomUUID()}`, failureCode: "DESKTOP_TEST_FAILURE", failureCategory: "application", retryable: false, safeMessage: "Controlled Desktop queue failure simulation.", failedAt: new Date().toISOString(), idempotencyKey: `desktop-fail-${crypto.randomUUID()}` });
    }
    if (response === null) {
      statusElement.textContent = "Operation cancelled or no open Project is available.";
      statusElement.dataset["state"] = "";
    } else {
      renderResponse(response);
    }
  } catch (error) {
    statusElement.textContent = error instanceof ProfileEditorError ? error.message : "The Project operation could not be completed safely.";
    statusElement.dataset["state"] = "failed";
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
  }
}

buttons.forEach((button) => button.addEventListener("click", () => void perform(button.dataset["action"] ?? "")));
queueStateFilterInput.addEventListener("change", () => void perform("queue-refresh"));
queueListElement.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const jobId = target.dataset["jobId"];
  if (jobId === undefined) return;
  void loadQueueJob(jobId).catch(() => {
    statusElement.textContent = "The selected Job could not be loaded safely.";
    statusElement.dataset["state"] = "failed";
  });
});
