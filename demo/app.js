const state = {
  summary: null,
  currentCase: null,
  currentArtifacts: null,
  currentPreview: null,
  currentAnimation: null,
  animationTimer: null,
  uploadUrl: null
};

const els = {
  targetSelect: document.querySelector("#target-select"),
  profileSelect: document.querySelector("#profile-select"),
  textTarget: document.querySelector("#text-target"),
  textSubmit: document.querySelector("#text-submit"),
  imageUpload: document.querySelector("#image-upload"),
  uploadPreview: document.querySelector("#upload-preview"),
  statePill: document.querySelector("#state-pill"),
  stateMessage: document.querySelector("#state-message"),
  embodimentStatus: document.querySelector("#embodiment-status"),
  stateBanner: document.querySelector("#state-banner"),
  caseTitle: document.querySelector("#case-title"),
  downloads: document.querySelector("#downloads"),
  targetArt: document.querySelector("#target-art"),
  creasePattern: document.querySelector("#crease-pattern"),
  previewCanvas: document.querySelector("#preview-canvas"),
  stepList: document.querySelector("#step-list"),
  proposalList: document.querySelector("#proposal-list"),
  criticList: document.querySelector("#critic-list")
};

const stateLabels = {
  empty: "Empty",
  loading: "Loading",
  invalid: "Invalid",
  failure: "Failure",
  partial: "Partial",
  success: "Success"
};

init();

function init() {
  els.targetSelect.addEventListener("change", () => {
    const selected = state.summary?.cases.find((pipelineCase) => pipelineCase.case_id === els.targetSelect.value);
    if (selected) {
      loadCase(selected);
    } else {
      setUiState("empty", "No case selected.");
      clearCaseView();
    }
  });
  els.profileSelect.addEventListener("change", () => {
    renderSelectedProfile();
  });

  els.textSubmit.addEventListener("click", loadTextTarget);
  els.textTarget.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      loadTextTarget();
    }
  });
  els.imageUpload.addEventListener("change", loadUploadedImage);
  window.addEventListener("resize", () => renderPreview(state.currentPreview));

  loadSummary();
}

async function loadSummary() {
  setUiState("loading", "Loading local pipeline output.");
  try {
    state.summary = await fetchJson("/out/m2-pipeline/summary.json");
    populateTargetSelect(state.summary.cases);
    const requestedCase = new URLSearchParams(window.location.search).get("case");
    const selected = state.summary.cases.find((pipelineCase) => pipelineCase.case_id === requestedCase);
    if (selected) {
      els.targetSelect.value = selected.case_id;
      await loadCase(selected);
      return;
    }
    setUiState("empty", "No case selected.");
  } catch {
    setUiState("partial", "Pipeline output missing.");
  }
}

function populateTargetSelect(cases) {
  els.targetSelect.replaceChildren(new Option("Select target", ""));
  for (const pipelineCase of cases) {
    els.targetSelect.append(new Option(pipelineCase.target.name, pipelineCase.case_id));
  }
}

async function loadTextTarget() {
  const query = els.textTarget.value.trim().toLowerCase();
  if (!query) {
    setUiState("invalid", "Enter a curated target.");
    return;
  }

  const selected = findMatchingCase(query);
  if (!selected) {
    setUiState("invalid", `No curated target matches "${query}".`);
    return;
  }

  els.targetSelect.value = selected.case_id;
  await loadCase(selected);
}

async function loadUploadedImage() {
  const file = els.imageUpload.files?.[0];
  if (!file) {
    return;
  }

  if (state.uploadUrl) {
    URL.revokeObjectURL(state.uploadUrl);
  }
  state.uploadUrl = URL.createObjectURL(file);
  els.uploadPreview.innerHTML = "";
  const image = document.createElement("img");
  image.src = state.uploadUrl;
  image.alt = file.name;
  els.uploadPreview.append(image);

  const selected = findMatchingCase(file.name.toLowerCase());
  if (!selected) {
    clearCaseView();
    els.caseTitle.textContent = file.name;
    setUiState("partial", "Upload captured without a curated pipeline match.");
    return;
  }

  els.targetSelect.value = selected.case_id;
  await loadCase(selected);
}

async function loadCase(pipelineCase) {
  state.currentCase = pipelineCase;
  state.currentArtifacts = null;
  state.currentPreview = null;
  state.currentAnimation = null;
  setUiState("loading", `Loading ${pipelineCase.target.name}.`);
  clearCaseView();
  els.caseTitle.textContent = pipelineCase.target.name;

  const artifacts = await fetchCaseArtifacts(pipelineCase);
  state.currentArtifacts = artifacts;
  populateProfileSelect(pipelineCase);
  renderDownloads(pipelineCase);
  renderTarget(artifacts.targetSvg);
  renderCrease(artifacts.creaseSvg);
  renderSelectedProfile();
  renderHistory(artifacts.proposalHistory, artifacts.criticHistory);
  renderPreview(artifacts.preview, artifacts.previewAnimation);

  if (artifacts.missing.length > 0) {
    setUiState("partial", `Missing ${artifacts.missing.join(", ")}.`);
    return;
  }
  if (artifacts.validation && artifacts.validation.ok === false) {
    setUiState("failure", artifacts.validation.errors.join("; ") || "Validation failed.");
    return;
  }

  setUiState("success", `${pipelineCase.target.name} loaded.`);
  setEmbodimentStatus(formatClaimStatus(pipelineCase.claim_status));
}

async function fetchCaseArtifacts(pipelineCase) {
  const paths = pipelineCase.artifact_paths;
  const results = await Promise.all([
    fetchTextMaybe(`/benchmarks/targets/${pipelineCase.target.file}`, "target"),
    fetchTextMaybe(artifactUrl(paths.crease_svg), "crease"),
    fetchJsonMaybe(artifactUrl(paths.validation), "validation"),
    fetchJsonMaybe(artifactUrl(paths.diagram_sequence), "sequence"),
    ...Object.entries(paths.diagram_sequences ?? {}).map(([profile, path]) => (
      fetchJsonMaybe(artifactUrl(path), `sequence:${profile}`)
    )),
    fetchJsonMaybe(artifactUrl(paths.diagram_step), "step"),
    fetchJsonMaybe(artifactUrl(paths.proposal_history), "proposal"),
    fetchJsonMaybe(artifactUrl(paths.critic_history), "critic"),
    fetchJsonMaybe(artifactUrl(paths.preview), "preview"),
    fetchJsonMaybe(artifactUrl(paths.preview_animation), "previewAnimation")
  ]);
  const missing = results.filter((result) => !result.ok).map((result) => result.label);
  const profileSequences = Object.fromEntries(
    results
      .filter((result) => result.ok && result.label.startsWith("sequence:"))
      .map((result) => [result.label.slice("sequence:".length), result.value])
  );

  return {
    missing,
    targetSvg: valueFor(results, "target"),
    creaseSvg: valueFor(results, "crease"),
    validation: valueFor(results, "validation"),
    diagramSequence: valueFor(results, "sequence"),
    profileSequences,
    diagramStep: valueFor(results, "step"),
    proposalHistory: valueFor(results, "proposal"),
    criticHistory: valueFor(results, "critic"),
    preview: valueFor(results, "preview"),
    previewAnimation: valueFor(results, "previewAnimation")
  };
}

function renderDownloads(pipelineCase) {
  const paths = pipelineCase.artifact_paths;
  const downloads = [
    ["FOLD", paths.derived_fold],
    ["SVG", paths.crease_svg],
    ["Preview", paths.preview],
    ["Animation", paths.preview_animation],
    ["Validation", paths.validation],
    ["Diagram", paths.diagram_sequence],
    ["Proposal", paths.proposal_history],
    ["Critic", paths.critic_history],
    ["Summary", paths.case_summary]
  ];

  els.downloads.replaceChildren(...downloads.filter(([, path]) => path).map(([label, path]) => {
    const link = document.createElement("a");
    link.href = artifactUrl(path);
    link.download = path.split("/").at(-1);
    link.textContent = label;
    return link;
  }));
}

function populateProfileSelect(pipelineCase) {
  const profiles = pipelineCase.executor_profiles ?? ["human-hand"];
  els.profileSelect.replaceChildren(...profiles.map((profile) => new Option(formatProfileLabel(profile), profile)));
  els.profileSelect.disabled = profiles.length === 0;
  els.profileSelect.value = pipelineCase.executor_profile ?? profiles[0] ?? "";
}

function renderTarget(svgText) {
  els.targetArt.innerHTML = svgText ?? "";
}

function renderCrease(svgText) {
  els.creasePattern.innerHTML = svgText ?? "";
}

function renderStep(sequence, fallbackStep) {
  els.stepList.innerHTML = "";
  const steps = Array.isArray(sequence?.steps) ? sequence.steps : fallbackStep ? [fallbackStep] : [];
  if (steps.length === 0) {
    return;
  }

  for (const step of steps) {
    const item = document.createElement("li");
    const profile = step.executor_profile_definition;
    item.innerHTML = [
      `<div class="step-summary"><strong>${escapeHtml(step.title)}</strong><span>${escapeHtml(step.executor_profile)}</span></div>`,
      `<p class="step-prestate">${escapeHtml(step.pre_state)}</p>`,
      renderProfile(profile),
      renderActionFlow(step.actions),
      renderChecks("Checks", step.checks),
      renderChecks("Failure Modes", step.failure_modes)
    ].join("");
    els.stepList.append(item);
  }
}

function renderSelectedProfile() {
  const artifacts = state.currentArtifacts;
  if (!artifacts) {
    renderStep(null, null);
    return;
  }
  const selectedProfile = els.profileSelect.value || state.currentCase?.executor_profile || "human-hand";
  const sequence = artifacts.profileSequences?.[selectedProfile] ?? artifacts.diagramSequence;
  renderStep(sequence, artifacts.diagramStep);
}

function renderProfile(profile) {
  if (!profile) {
    return "";
  }
  return [
    `<dl class="executor-profile">`,
    `<div><dt>Profile</dt><dd>${escapeHtml(profile.name)} (${escapeHtml(profile.id)})</dd></div>`,
    `<div><dt>Primitives</dt><dd>${escapeHtml(profile.contact_primitives.join(", "))}</dd></div>`,
    `<div><dt>Unavailable</dt><dd>${escapeHtml(profile.unavailable_actions.join(", ") || "none")}</dd></div>`,
    `</dl>`
  ].join("");
}

function renderActionFlow(actions) {
  const items = (actions ?? []).map((action) => {
    const details = [
      action.direction ? `Direction: ${action.direction}` : null,
      action.target ? `Target: ${action.target}` : null,
      action.contacts?.length ? `Contacts: ${action.contacts.join(", ")}` : null
    ].filter(Boolean);
    return [
      `<li data-phase="${escapeHtml(action.phase)}">`,
      `<span>${escapeHtml(formatPhase(action.phase))}</span>`,
      `<p>${escapeHtml(action.text)}</p>`,
      details.length ? `<small>${escapeHtml(details.join(" | "))}</small>` : "",
      `</li>`
    ].join("");
  }).join("");
  return `<ol class="action-flow">${items}</ol>`;
}

function renderChecks(label, entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return "";
  }
  const items = entries.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("");
  return `<section class="step-notes"><h4>${escapeHtml(label)}</h4><ul>${items}</ul></section>`;
}

function renderHistory(proposalHistory, criticHistory) {
  els.proposalList.innerHTML = "";
  els.criticList.innerHTML = "";

  for (const candidate of proposalHistory?.candidates ?? []) {
    const item = document.createElement("li");
    item.dataset.status = candidate.validation_status;
    item.innerHTML = `<strong>${escapeHtml(candidate.candidate_id)}</strong><br>${escapeHtml(candidate.rationale)}`;
    els.proposalList.append(item);
  }

  for (const entry of criticHistory?.entries ?? []) {
    const item = document.createElement("li");
    item.dataset.status = entry.validation_ok ? "valid" : "invalid";
    item.innerHTML = `<strong>${escapeHtml(entry.candidate_id)}</strong><br>${entry.score.toFixed(2)} - ${escapeHtml(entry.verdict)}`;
    els.criticList.append(item);
  }
}

function renderPreview(preview, animation = state.currentAnimation) {
  state.currentPreview = preview ?? state.currentPreview;
  state.currentAnimation = animation ?? state.currentAnimation;
  if (state.animationTimer) {
    clearInterval(state.animationTimer);
    state.animationTimer = null;
  }
  const frames = Array.isArray(state.currentAnimation?.frames) ? state.currentAnimation.frames : [];
  if (frames.length > 1) {
    let frameIndex = 0;
    drawPreviewFrame(frames[frameIndex].preview);
    state.animationTimer = setInterval(() => {
      frameIndex = (frameIndex + 1) % frames.length;
      drawPreviewFrame(frames[frameIndex].preview);
    }, 700);
    return;
  }
  drawPreviewFrame(state.currentPreview);
}

function drawPreviewFrame(preview) {
  const canvas = els.previewCanvas;
  const context = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(320, rect.width || 560);
  const height = Math.max(220, rect.height || 360);
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  if (!preview) {
    context.fillStyle = "#5f6570";
    context.fillText("No preview", 24, 32);
    return;
  }

  const vertices = preview.vertices;
  const edges = preview.edges;
  if (!vertices.length) {
    context.fillStyle = "#5f6570";
    context.fillText("No preview", 24, 32);
    return;
  }
  const bounds = getBounds(vertices);
  const scale = Math.min(width / 2.8, height / 2.1);
  const origin = { x: width / 2, y: height * 0.25 };
  const projected = new Map(vertices.map((vertex) => [vertex.index, project(vertex, bounds, scale, origin)]));

  context.lineCap = "round";
  for (const edge of edges) {
    const start = projected.get(edge.vertices[0]);
    const end = projected.get(edge.vertices[1]);
    if (!start || !end) {
      continue;
    }
    context.strokeStyle = colorForAssignment(edge.assignment);
    context.lineWidth = edge.assignment === "B" ? 3 : 2;
    if (edge.assignment === "V") {
      context.setLineDash([8, 6]);
    } else if (edge.assignment === "U") {
      context.setLineDash([3, 6]);
    } else {
      context.setLineDash([]);
    }
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
  }
  context.setLineDash([]);

  for (const point of projected.values()) {
    context.fillStyle = "#171717";
    context.beginPath();
    context.arc(point.x, point.y, 3, 0, Math.PI * 2);
    context.fill();
  }
}

function findMatchingCase(query) {
  return state.summary?.cases.find((pipelineCase) => {
    const haystack = `${pipelineCase.case_id} ${pipelineCase.target.name} ${pipelineCase.target.file}`.toLowerCase();
    return haystack.includes(query) || query.includes(pipelineCase.case_id.replace("simple-", ""));
  });
}

function clearCaseView() {
  els.downloads.innerHTML = "";
  els.targetArt.innerHTML = "";
  els.creasePattern.innerHTML = "";
  els.stepList.innerHTML = "";
  els.proposalList.innerHTML = "";
  els.criticList.innerHTML = "";
  els.profileSelect.replaceChildren(new Option("Select executor", ""));
  els.profileSelect.disabled = true;
  state.currentArtifacts = null;
  state.currentPreview = null;
  state.currentAnimation = null;
  if (state.animationTimer) {
    clearInterval(state.animationTimer);
    state.animationTimer = null;
  }
  setEmbodimentStatus("No case selected.");
  renderPreview(null);
}

function setUiState(kind, message) {
  els.statePill.dataset.state = kind;
  els.statePill.textContent = stateLabels[kind] ?? kind;
  els.stateMessage.textContent = message;
  els.stateBanner.dataset.state = kind;
  els.stateBanner.textContent = message;
}

function setEmbodimentStatus(message) {
  els.embodimentStatus.textContent = `Claim status: ${message}`;
}

function formatClaimStatus(claimStatus) {
  if (!claimStatus?.claim_label) {
    return "Claim label unavailable.";
  }
  return claimStatus.claim_label;
}

function formatProfileLabel(profile) {
  const labels = {
    "human-hand": "Human hand",
    "two-finger-gripper": "Robot gripper",
    "cat-paw-profile": "Cat paw",
    "dog-paw-profile": "Dog paw"
  };
  return labels[profile] ?? profile;
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${path}: ${response.status}`);
  }
  return response.json();
}

async function fetchText(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${path}: ${response.status}`);
  }
  return response.text();
}

async function fetchJsonMaybe(path, label) {
  if (!path) {
    return { label, ok: false, value: null };
  }
  try {
    return { label, ok: true, value: await fetchJson(path) };
  } catch {
    return { label, ok: false, value: null };
  }
}

async function fetchTextMaybe(path, label) {
  if (!path) {
    return { label, ok: false, value: null };
  }
  try {
    return { label, ok: true, value: await fetchText(path) };
  } catch {
    return { label, ok: false, value: null };
  }
}

function valueFor(results, label) {
  return results.find((result) => result.label === label)?.value ?? null;
}

function artifactUrl(path) {
  if (!path) {
    return null;
  }
  return `/${path.replace(/^\/+/, "")}`;
}

function getBounds(vertices) {
  return vertices.reduce(
    (bounds, vertex) => ({
      minX: Math.min(bounds.minX, vertex.x),
      maxX: Math.max(bounds.maxX, vertex.x),
      minY: Math.min(bounds.minY, vertex.y),
      maxY: Math.max(bounds.maxY, vertex.y)
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  );
}

function project(vertex, bounds, scale, origin) {
  const xRange = Math.max(bounds.maxX - bounds.minX, 1);
  const yRange = Math.max(bounds.maxY - bounds.minY, 1);
  const x = (vertex.x - bounds.minX) / xRange - 0.5;
  const y = (vertex.y - bounds.minY) / yRange - 0.5;
  return {
    x: origin.x + (x - y) * scale,
    y: origin.y + (x + y) * scale * 0.55 - vertex.z * scale * 1.6
  };
}

function colorForAssignment(assignment) {
  switch (assignment) {
    case "B":
      return "#171717";
    case "M":
      return "#dc2626";
    case "V":
      return "#2563eb";
    case "F":
      return "#6b7280";
    default:
      return "#9ca3af";
  }
}

function formatPhase(phase) {
  return String(phase)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
