import * as THREE from "../node_modules/three/build/three.module.js";

const state = {
  summary: null,
  currentCase: null,
  currentArtifacts: null,
  currentPreview: null,
  currentAnimation: null,
  foldedPreview: null,
  stepFoldedPreview: null,
  currentStepIndex: 0,
  animationTimer: null,
  stepAnimationTimer: null,
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
  validationStatus: document.querySelector("#validation-status"),
  stateBanner: document.querySelector("#state-banner"),
  caseTitle: document.querySelector("#case-title"),
  downloads: document.querySelector("#downloads"),
  targetArt: document.querySelector("#target-art"),
  creasePattern: document.querySelector("#crease-pattern"),
  foldedPreviewStage: document.querySelector("#folded-preview-stage"),
  stepFoldedPreviewStage: document.querySelector("#step-folded-preview-stage"),
  previewCanvas: document.querySelector("#preview-canvas"),
  stepPreviewCanvas: document.querySelector("#step-preview-canvas"),
  stepDiagram: document.querySelector("#step-diagram"),
  stepTabs: document.querySelector("#step-tabs"),
  stepDetail: document.querySelector("#step-detail"),
  stepProgress: document.querySelector("#step-progress"),
  caseEvidence: document.querySelector("#case-evidence"),
  executorImage: document.querySelector("#executor-image"),
  executorCaption: document.querySelector("#executor-caption"),
  instructionLabel: document.querySelector("#instruction-label"),
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

const assetBase = resolveAssetBase();
const pageParams = new URLSearchParams(window.location.search);

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
    state.summary = await fetchJson(assetUrl("out/m2-pipeline/summary.json"));
    populateTargetSelect(state.summary.cases);
    const requestedCase = pageParams.get("case");
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
  renderMainPreview(pipelineCase, artifacts);

  if (artifacts.missing.length > 0) {
    setUiState("partial", `Missing ${artifacts.missing.join(", ")}.`);
    return;
  }
  if (artifacts.validation && artifacts.validation.ok === false) {
    setUiState("failure", artifacts.validation.errors.join("; ") || "Validation failed.");
    return;
  }

  setUiState(displayStateForCase(pipelineCase), displayMessageForCase(pipelineCase));
  setEmbodimentStatus(formatClaimStatus(pipelineCase.claim_status));
}

async function fetchCaseArtifacts(pipelineCase) {
  const paths = pipelineCase.artifact_paths;
  const results = await Promise.all([
    fetchTextMaybe(assetUrl(`benchmarks/targets/${pipelineCase.target.file}`), "target"),
    fetchTextMaybe(artifactUrl(paths.crease_svg), "crease"),
    fetchJsonMaybe(artifactUrl(paths.validation), "validation"),
    fetchJsonMaybe(artifactUrl(paths.community_fold_validation), "communityFoldValidation"),
    fetchJsonMaybe(artifactUrl(paths.flat_folder_validation), "flatFolderValidation"),
    fetchJsonMaybe(artifactUrl(paths.flat_folder_state), "flatFolderState"),
    fetchJsonMaybe(artifactUrl(paths.target_match), "targetMatch"),
    fetchJsonMaybe(artifactUrl(paths.display_decision), "displayDecision"),
    canRenderBackend3d(pipelineCase)
      ? fetchJsonMaybe(artifactUrl(paths.folded_state_fold), "foldedStateFold")
      : { ok: true, label: "foldedStateFold", value: null },
    fetchJsonMaybe(artifactUrl(paths.origami_simulator_preview), "origamiSimulatorPreview"),
    fetchJsonMaybe(artifactUrl(paths.step_visuals), "stepVisuals"),
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
  const stepVisuals = valueFor(results, "stepVisuals");
  const stepFoldedStates = await fetchStepFoldedStates(stepVisuals);
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
    communityFoldValidation: valueFor(results, "communityFoldValidation"),
    flatFolderValidation: valueFor(results, "flatFolderValidation"),
    flatFolderState: valueFor(results, "flatFolderState"),
    targetMatch: valueFor(results, "targetMatch"),
    displayDecision: valueFor(results, "displayDecision"),
    foldedStateFold: valueFor(results, "foldedStateFold"),
    origamiSimulatorPreview: valueFor(results, "origamiSimulatorPreview"),
    stepVisuals,
    stepFoldedStates,
    diagramSequence: valueFor(results, "sequence"),
    profileSequences,
    diagramStep: valueFor(results, "step"),
    proposalHistory: valueFor(results, "proposal"),
    criticHistory: valueFor(results, "critic"),
    preview: valueFor(results, "preview"),
    previewAnimation: valueFor(results, "previewAnimation")
  };
}

async function fetchStepFoldedStates(stepVisuals) {
  const paths = new Set();
  for (const step of Object.values(stepVisuals?.profile_steps ?? {}).flat()) {
    if (step?.pre_state_fold_path) {
      paths.add(step.pre_state_fold_path);
    }
    if (step?.input_fold_path) {
      paths.add(step.input_fold_path);
    }
    if (step?.folded_state_path) {
      paths.add(step.folded_state_path);
    }
  }
  if (paths.size === 0) {
    return new Map();
  }
  const entries = await Promise.all([...paths].map(async (path) => {
    try {
      return [path, await fetchJson(artifactUrl(path))];
    } catch {
      return [path, null];
    }
  }));
  return new Map(entries.filter(([, fold]) => fold));
}

function renderDownloads(pipelineCase) {
  const paths = pipelineCase.artifact_paths;
  const downloads = [
    ["FOLD", paths.derived_fold],
    ["SVG", paths.crease_svg],
    ["Preview", paths.preview],
    ["Animation", paths.preview_animation],
    ["Step States", paths.step_states],
    ["Validation", paths.validation],
    ["FOLD Check", paths.community_fold_validation],
    ["Flat-Folder", paths.flat_folder_validation],
    ["Solver State", paths.flat_folder_state],
    ["Folded State", paths.folded_state_fold],
    ["Target Match", paths.target_match],
    ["Display Decision", paths.display_decision],
    ["Simulator Export", paths.origami_simulator_fold],
    ["Simulator Route", paths.origami_simulator_preview],
    ["Step Visuals", paths.step_visuals],
    ["Program IR", paths.fold_program_ir],
    ["Walkthrough", paths.visual_walkthrough],
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
  const requestedProfile = pageParams.get("profile");
  els.profileSelect.value = profiles.includes(requestedProfile)
    ? requestedProfile
    : pipelineCase.executor_profile ?? profiles[0] ?? "";
}

function renderTarget(svgText) {
  els.targetArt.innerHTML = svgText ?? "";
}

function renderCrease(svgText) {
  els.creasePattern.innerHTML = svgText ?? "";
}

function renderStep(sequence, fallbackStep, selectedIndex = state.currentStepIndex) {
  els.stepList.innerHTML = "";
  renderInstructionLabel(sequence);
  const steps = Array.isArray(sequence?.steps) ? sequence.steps : fallbackStep ? [fallbackStep] : [];
  if (steps.length === 0) {
    return;
  }

  const stepIndex = Math.min(Math.max(selectedIndex, 0), steps.length - 1);
  const step = steps[stepIndex];
  els.stepList.start = stepIndex + 1;
  const item = document.createElement("li");
  const profile = step.executor_profile_definition;
  item.innerHTML = [
    `<div class="step-summary"><strong>${escapeHtml(step.title)}</strong><span>${escapeHtml(step.executor_profile)}</span></div>`,
    `<p class="step-prestate">${escapeHtml(step.pre_state)}</p>`,
    renderProfile(profile),
    renderExecutorVisualMetadata(sequence?.executor_visual_metadata),
    renderActionFlow(step.actions),
    renderChecks("Checks", step.checks),
    renderChecks("Failure Modes", step.failure_modes)
  ].join("");
  els.stepList.append(item);
}

function renderSelectedProfile() {
  const artifacts = state.currentArtifacts;
  if (!artifacts) {
    renderWalkthrough(null, null, null);
    return;
  }
  const selectedProfile = els.profileSelect.value || state.currentCase?.executor_profile || "human-hand";
  const sequence = artifacts.profileSequences?.[selectedProfile] ?? artifacts.diagramSequence;
  renderWalkthrough(sequence, artifacts.stepVisuals, artifacts.diagramStep, selectedProfile);
  renderEvidenceNotice(state.currentCase, artifacts);
  renderValidationStatus(state.currentCase, artifacts);
}

function renderWalkthrough(sequence, stepVisuals, fallbackStep, selectedProfile = "human-hand") {
  const steps = Array.isArray(sequence?.steps) ? sequence.steps : fallbackStep ? [fallbackStep] : [];
  const visuals = Array.isArray(stepVisuals?.profile_steps?.[selectedProfile])
    ? stepVisuals.profile_steps[selectedProfile]
    : Array.isArray(stepVisuals?.steps) ? stepVisuals.steps : [];
  const requestedStep = Number(pageParams.get("step"));
  if (Number.isInteger(requestedStep) && requestedStep >= 1 && requestedStep <= steps.length) {
    state.currentStepIndex = requestedStep - 1;
    pageParams.delete("step");
  }
  state.currentStepIndex = Math.min(state.currentStepIndex, Math.max(steps.length - 1, 0));
  els.stepTabs.replaceChildren(...steps.map((step, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "step-tab";
    button.dataset.active = index === state.currentStepIndex ? "true" : "false";
    button.textContent = `${index + 1}`;
    button.title = step.title;
    button.addEventListener("click", () => {
      state.currentStepIndex = index;
      renderWalkthrough(sequence, stepVisuals, fallbackStep, selectedProfile);
    });
    return button;
  }));
  els.stepProgress.textContent = steps.length === 0 ? "0 steps" : `${steps.length} steps`;

  const selectedStep = steps[state.currentStepIndex];
  const selectedVisual = visuals[state.currentStepIndex];
  els.stepDiagram.innerHTML = selectedVisual?.svg ?? "";
  renderStepStatePreview(selectedVisual);
  renderExecutorImage(sequence?.executor_visual_metadata);
  els.stepDetail.innerHTML = selectedStep ? [
    `<div class="step-detail-title"><strong>Step ${escapeHtml(selectedStep.step)} - ${escapeHtml(selectedStep.title)}</strong><span>${escapeHtml(selectedStep.fold.assignment)}</span></div>`,
    `<p>${escapeHtml(selectedStep.instruction)}</p>`,
    `<dl>`,
    `<div><dt>Fold line</dt><dd>${escapeHtml(selectedStep.fold.landmarks.line)}</dd></div>`,
    `<div><dt>Motion</dt><dd>${escapeHtml(selectedStep.fold_direction.direction ?? selectedStep.fold_direction.text)}</dd></div>`,
    `<div><dt>Contact</dt><dd>${escapeHtml((selectedStep.crease_press.contacts ?? []).join(", ") || "none")}</dd></div>`,
    `</dl>`,
    renderStepVisualSemantics(selectedVisual)
  ].join("") : "";
  renderStep(sequence, fallbackStep, state.currentStepIndex);
}

function renderEvidenceNotice(pipelineCase, artifacts) {
  const quality = pipelineCase?.result_quality;
  const decision = artifacts?.displayDecision ?? pipelineCase?.display_decision;
  if (!quality) {
    els.caseEvidence.innerHTML = "";
    els.caseEvidence.dataset.status = "empty";
    return;
  }
  const flatFolder = artifacts?.flatFolderValidation ?? pipelineCase.external_validation?.flat_folder;
  const targetMatch = artifacts?.targetMatch ?? pipelineCase.external_validation?.target_match;
  const displayMode = decision?.display_mode ?? pipelineCase.display_mode ?? quality.display_mode ?? "inspection-only";
  const title = displayModeTitle(displayMode);
  els.caseEvidence.dataset.status = displayMode === "completed-usable" || displayMode === "completed-usable-generated" ? "complete" : "warning";
  els.caseEvidence.innerHTML = [
    `<strong>${escapeHtml(title)}</strong>`,
    `<p>${escapeHtml(decision?.summary ?? quality.summary)}</p>`,
    `<dl>`,
    `<div><dt>Display</dt><dd>${escapeHtml(formatDisplayMode(displayMode))}</dd></div>`,
    `<div><dt>Decision</dt><dd>${escapeHtml(formatDisplayDecision(decision))}</dd></div>`,
    `<div><dt>Target match</dt><dd>${escapeHtml(formatTargetMatchQuality(quality.target_match_status, targetMatch))}</dd></div>`,
    `<div><dt>Foldability</dt><dd>${escapeHtml(formatFoldabilityQuality(quality.foldability_status, flatFolder))}</dd></div>`,
    `<div><dt>Preview</dt><dd>${escapeHtml(formatPreviewQuality(quality.preview_status))}</dd></div>`,
    `</dl>`
  ].join("");
}

function renderExecutorImage(metadata) {
  if (!metadata?.visual_asset_path) {
    els.executorImage.removeAttribute("src");
    els.executorImage.alt = "";
    els.executorCaption.textContent = "No executor visual.";
    return;
  }
  els.executorImage.src = assetUrl(metadata.visual_asset_path);
  els.executorImage.alt = formatProfileLabel(metadata.profile_id);
  els.executorCaption.textContent = `${formatProfileLabel(metadata.profile_id)} - ${formatTitle(metadata.visual_asset_status)}`;
}

function renderStepStatePreview(stepVisual) {
  const preFold = stepVisual?.pre_state_fold_path
    ? state.currentArtifacts?.stepFoldedStates?.get(stepVisual.pre_state_fold_path)
    : null;
  const postFold = stepVisual?.folded_state_path
    ? state.currentArtifacts?.stepFoldedStates?.get(stepVisual.folded_state_path)
    : null;
  const folds = preFold && postFold ? [preFold, postFold] : postFold ? [postFold] : [];
  if (folds.length > 0 && renderFoldedStatePreview(folds[0], {
    stage: els.stepFoldedPreviewStage,
    stateKey: "stepFoldedPreview",
    rendererLabel: "solver-backed-step-state",
    overlay: stepVisual?.executor_overlay,
    animationFolds: folds,
    cameraPosition: [0.72, -1.2, 1.05]
  })) {
    els.stepPreviewCanvas.hidden = true;
    els.stepFoldedPreviewStage.hidden = false;
    return;
  }
  disposeFoldedPreview("stepFoldedPreview", els.stepFoldedPreviewStage);
  els.stepFoldedPreviewStage.hidden = true;
  els.stepPreviewCanvas.hidden = false;
  drawPreviewOnCanvas(els.stepPreviewCanvas, stepVisual?.preview_3d ?? null, { activeEdge: stepVisual?.edge, focusMode: true });
}

function renderInstructionLabel(sequence) {
  els.instructionLabel.textContent = sequence?.executor_visual_metadata?.instruction_label
    ? formatTitle(sequence.executor_visual_metadata.instruction_label)
    : "Profile visual instructions";
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

function renderExecutorVisualMetadata(metadata) {
  if (!metadata) {
    return "";
  }
  return [
    `<dl class="executor-profile executor-visuals">`,
    `<div><dt>Contact Zones</dt><dd>${escapeHtml(metadata.contact_zones.join(", ") || "none")}</dd></div>`,
    `<div><dt>Unsupported</dt><dd>${escapeHtml(metadata.unsupported_actions.join(", ") || "none")}</dd></div>`,
    `<div><dt>Visual</dt><dd>${escapeHtml(formatTitle(metadata.visual_asset_status))}</dd></div>`,
    `</dl>`
  ].join("");
}

function renderStepVisualSemantics(stepVisual) {
  if (!stepVisual) {
    return "";
  }
  const legend = (stepVisual.annotation_legend ?? []).map((entry) => (
    `<li><strong>${escapeHtml(formatTitle(entry.key))}</strong>: ${escapeHtml(entry.meaning)}</li>`
  )).join("");
  const overlay = stepVisual.executor_overlay;
  const zones = (overlay?.zones ?? []).map((zone) => `${zone.id} (${zone.primitive})`).join(", ");
  return [
    `<section class="step-visual-semantics">`,
    `<h4>Visual Semantics</h4>`,
    legend ? `<ul>${legend}</ul>` : "",
    overlay ? `<p>${escapeHtml(formatProfileLabel(overlay.executor_profile))}: ${escapeHtml(overlay.status)}${zones ? ` - ${escapeHtml(zones)}` : ""}</p>` : "",
    stepVisual.display_source_status ? `<p>${escapeHtml(formatTitle(stepVisual.display_source_status))}${stepVisual.frame_difference ? ` - ${escapeHtml(formatFrameDifference(stepVisual.frame_difference))}` : ""}</p>` : "",
    `</section>`
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

function renderMainPreview(pipelineCase, artifacts) {
  const canRenderFolded = canRenderBackend3d(pipelineCase, artifacts)
    && artifacts?.foldedStateFold;
  if (canRenderFolded) {
    const rendered = renderFoldedStatePreview(artifacts.foldedStateFold, {
      stage: els.foldedPreviewStage,
      stateKey: "foldedPreview",
      rendererLabel: "solver-backed-folded-state"
    });
    if (rendered) {
      els.previewCanvas.hidden = true;
      els.foldedPreviewStage.hidden = false;
      return;
    }
  }
  els.foldedPreviewStage.hidden = true;
  els.previewCanvas.hidden = false;
  disposeFoldedPreview("foldedPreview", els.foldedPreviewStage);
  renderPreview(artifacts.preview, artifacts.previewAnimation);
}

function renderFoldedStatePreview(fold, options = {}) {
  const stage = options.stage ?? els.foldedPreviewStage;
  const stateKey = options.stateKey ?? "foldedPreview";
  disposeFoldedPreview(stateKey, stage);
  const rect = stage.getBoundingClientRect();
  const width = Math.max(320, Math.floor(rect.width || 560));
  const height = Math.max(260, Math.floor(rect.height || 360));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf8fafc);
  const camera = new THREE.PerspectiveCamera(35, width / height, 0.01, 100);
  camera.position.set(...(options.cameraPosition ?? [0.65, -1.35, 1.15]));
  camera.lookAt(0, 0, 0);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
    powerPreference: "low-power"
  });
  } catch {
    return false;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  renderer.domElement.dataset.renderer = options.rendererLabel ?? "solver-backed-folded-state";
  if (options.overlay?.executor_profile) {
    renderer.domElement.dataset.overlayProfile = options.overlay.executor_profile;
    renderer.domElement.dataset.overlayZoneCount = String(options.overlay.zones?.length ?? 0);
  }
  stage.replaceChildren(renderer.domElement);

  const group = new THREE.Group();
  const renderFoldFrame = (frameFold, frameIndex = 0) => {
    clearGroup(group);
    const vertices = normalizeFoldedVertices(frameFold.vertices_coords ?? []);
    for (const [index, face] of (frameFold.faces_vertices ?? []).entries()) {
      const shape = face.map((vertexIndex) => vertices[vertexIndex]).filter(Boolean);
      if (shape.length < 3) {
        continue;
      }
      const geometry = polygonGeometry(shape, index);
      const material = new THREE.MeshStandardMaterial({
        color: index % 2 === 0 ? 0xe0f2fe : 0xf8fafc,
        roughness: 0.72,
        metalness: 0.02,
        side: THREE.DoubleSide
      });
      group.add(new THREE.Mesh(geometry, material));
      group.add(edgeLines(shape, index));
    }
    if (options.overlay) {
      addExecutorOverlay3d(group, options.overlay, vertices);
    }
    renderer.domElement.dataset.stepFrame = String(frameIndex);
    renderer.render(scene, camera);
  };
  const animationFolds = Array.isArray(options.animationFolds) && options.animationFolds.length > 0
    ? options.animationFolds
    : [fold];
  renderer.domElement.dataset.stepFrameCount = String(animationFolds.length);
  if (animationFolds.length > 1) {
    renderer.domElement.dataset.stepAnimated = "true";
  }
  scene.add(group);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x94a3b8, 2.6));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(1.4, -1.8, 2.3);
  scene.add(keyLight);
  renderFoldFrame(animationFolds[0], 0);
  let timer = null;
  if (animationFolds.length > 1) {
    let frameIndex = 0;
    timer = setInterval(() => {
      frameIndex = (frameIndex + 1) % animationFolds.length;
      renderFoldFrame(animationFolds[frameIndex], frameIndex);
    }, 800);
  }
  state[stateKey] = { renderer, scene, timer };
  return true;
}

function clearGroup(group) {
  for (const child of [...group.children]) {
    group.remove(child);
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) {
      child.material.forEach((material) => material.dispose?.());
    } else {
      child.material?.dispose?.();
    }
  }
}

function normalizeFoldedVertices(vertices) {
  const points = vertices.map(([x, y], index) => ({ index, x, y }));
  const bounds = points.reduce((result, point) => ({
    minX: Math.min(result.minX, point.x),
    maxX: Math.max(result.maxX, point.x),
    minY: Math.min(result.minY, point.y),
    maxY: Math.max(result.maxY, point.y)
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  const width = Math.max(bounds.maxX - bounds.minX, 1e-6);
  const height = Math.max(bounds.maxY - bounds.minY, 1e-6);
  const scale = 1.45 / Math.max(width, height);
  return Object.fromEntries(points.map((point) => [point.index, {
    x: (point.x - (bounds.minX + bounds.maxX) / 2) * scale,
    y: (point.y - (bounds.minY + bounds.maxY) / 2) * scale
  }]));
}

function polygonGeometry(points, layerIndex) {
  const geometry = new THREE.BufferGeometry();
  const z = layerIndex * 0.012;
  const positions = [];
  for (let index = 1; index < points.length - 1; index += 1) {
    for (const point of [points[0], points[index], points[index + 1]]) {
      positions.push(point.x, point.y, z);
    }
  }
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function edgeLines(points, layerIndex) {
  const z = layerIndex * 0.012 + 0.004;
  const positions = [];
  for (let index = 0; index < points.length; index += 1) {
    const start = points[index];
    const end = points[(index + 1) % points.length];
    positions.push(start.x, start.y, z, end.x, end.y, z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0x334155 }));
}

function addExecutorOverlay3d(group, overlay, vertices) {
  const zones = overlay.zones ?? [];
  const profileStyle = overlayStyle(overlay.executor_profile);
  const edgePoints = overlay.geometry_binding?.edge?.map((vertexIndex) => vertices[vertexIndex]).filter(Boolean) ?? [];
  const edgeCenter = edgePoints.length === 2
    ? midpoint3(edgePoints[0], edgePoints[1])
    : { x: 0, y: 0, z: 0.08 };
  for (const [index, zone] of zones.entries()) {
    const sourcePoint = zone.center_preview
      ? normalizePreviewPoint(zone.center_preview, vertices)
      : offsetOverlayPoint(edgeCenter, index, zones.length);
    const point = {
      x: sourcePoint.x,
      y: sourcePoint.y,
      z: 0.12 + index * 0.018
    };
    const radius = overlayRadius(zone, profileStyle);
    const geometry = new THREE.SphereGeometry(radius, 24, 12);
    const material = new THREE.MeshStandardMaterial({
      color: zone.primitive === "blocked-precision" ? 0xef4444 : profileStyle.color,
      emissive: zone.primitive === "blocked-precision" ? 0x7f1d1d : profileStyle.emissive,
      emissiveIntensity: zone.primitive === "blocked-precision" ? 0.28 : 0.16,
      roughness: 0.58,
      metalness: 0.04,
      transparent: true,
      opacity: zone.primitive === "blocked-precision" ? 0.62 : profileStyle.opacity
    });
    const marker = new THREE.Mesh(geometry, material);
    marker.position.set(point.x, point.y, point.z);
    marker.scale.set(profileStyle.scaleX, profileStyle.scaleY, profileStyle.scaleZ);
    marker.userData.overlayZone = zone.id;
    group.add(marker);
  }
}

function overlayStyle(profileId) {
  switch (profileId) {
    case "cat-paw-profile":
    case "dog-paw-profile":
      return { color: 0xf59e0b, emissive: 0x92400e, opacity: 0.52, scaleX: 1.45, scaleY: 1.1, scaleZ: 0.32, radius: 0.095 };
    case "two-finger-gripper":
      return { color: 0x38bdf8, emissive: 0x075985, opacity: 0.58, scaleX: 0.8, scaleY: 0.8, scaleZ: 0.7, radius: 0.062 };
    default:
      return { color: 0xfacc15, emissive: 0x854d0e, opacity: 0.58, scaleX: 0.85, scaleY: 0.85, scaleZ: 0.7, radius: 0.058 };
  }
}

function overlayRadius(zone, profileStyle) {
  const svgRadius = zone.radius ?? Math.max(zone.radius_x ?? 0, zone.radius_y ?? 0);
  return Math.max(profileStyle.radius, Math.min(0.16, (svgRadius || 12) / 360));
}

function normalizePreviewPoint(point, vertices) {
  const source = { x: point.x ?? 0, y: point.y ?? 0 };
  const vertexValues = Object.values(vertices);
  if (vertexValues.length === 0) {
    return { x: source.x, y: source.y, z: source.z ?? 0 };
  }
  const bounds = vertexValues.reduce((result, vertex) => ({
    minX: Math.min(result.minX, vertex.x),
    maxX: Math.max(result.maxX, vertex.x),
    minY: Math.min(result.minY, vertex.y),
    maxY: Math.max(result.maxY, vertex.y)
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  return {
    x: clamp(source.x, bounds.minX - 0.24, bounds.maxX + 0.24),
    y: clamp(source.y, bounds.minY - 0.24, bounds.maxY + 0.24),
    z: source.z ?? 0
  };
}

function offsetOverlayPoint(center, index, total) {
  const offset = (index - (total - 1) / 2) * 0.16;
  return {
    x: center.x + offset,
    y: center.y + 0.12,
    z: center.z ?? 0
  };
}

function midpoint3(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: ((a.z ?? 0) + (b.z ?? 0)) / 2
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function disposeFoldedPreview(stateKey = "foldedPreview", stage = els.foldedPreviewStage) {
  const previewState = state[stateKey];
  if (!previewState) {
    return;
  }
  if (previewState.timer) {
    clearInterval(previewState.timer);
  }
  previewState.scene.traverse((node) => {
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) {
      node.material.forEach((material) => material.dispose?.());
    } else {
      node.material?.dispose?.();
    }
  });
  previewState.renderer.dispose();
  stage.replaceChildren();
  state[stateKey] = null;
}

function drawPreviewFrame(preview) {
  drawPreviewOnCanvas(els.previewCanvas, preview);
}

function drawPreviewOnCanvas(canvas, preview, options = {}) {
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
  const projected = projectVertices(vertices, width, height);
  const activeEdge = options.activeEdge ? edgeKey(options.activeEdge) : null;
  const faces = Array.isArray(preview.faces) ? preview.faces : [];

  drawPreviewShadow(context, faces, projected);
  drawPreviewFaces(context, faces, projected);

  context.lineCap = "round";
  context.lineJoin = "round";
  for (const edge of edges) {
    const start = projected.get(edge.vertices[0]);
    const end = projected.get(edge.vertices[1]);
    if (!start || !end) {
      continue;
    }
    const isActive = activeEdge && edgeKey(edge.vertices) === activeEdge;
    context.strokeStyle = isActive ? "#f97316" : options.focusMode ? referenceEdgeColor(edge.assignment) : colorForAssignment(edge.assignment);
    context.lineWidth = isActive ? 5 : edge.assignment === "B" ? 3 : options.focusMode ? 1.6 : 2;
    if (isActive) {
      context.setLineDash([]);
    } else if (options.focusMode && edge.assignment !== "B") {
      context.setLineDash([6, 7]);
    } else if (edge.assignment === "V") {
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
    context.fillStyle = "#0f172a";
    context.beginPath();
    context.arc(point.x, point.y, 2.5, 0, Math.PI * 2);
    context.fill();
  }
}

function drawPreviewShadow(context, faces, projected) {
  const points = faces.flatMap((face) => face.vertices.map((vertexIndex) => projected.get(vertexIndex)).filter(Boolean));
  if (points.length === 0) {
    return;
  }
  const hull = convexHull(points);
  if (hull.length < 3) {
    return;
  }
  context.save();
  context.translate(0, 18);
  context.fillStyle = "rgba(15, 23, 42, 0.12)";
  context.filter = "blur(12px)";
  drawPolygon(context, hull);
  context.fill();
  context.restore();
}

function drawPreviewFaces(context, faces, projected) {
  const orderedFaces = [...faces].sort((a, b) => (a.average_z ?? 0) - (b.average_z ?? 0));
  for (const face of orderedFaces) {
    const points = face.vertices.map((vertexIndex) => projected.get(vertexIndex)).filter(Boolean);
    if (points.length < 3) {
      continue;
    }
    const tone = Math.max(-0.1, Math.min(0.16, face.average_z ?? 0));
    const gradient = context.createLinearGradient(points[0].x, points[0].y, points.at(-1).x, points.at(-1).y);
    gradient.addColorStop(0, rgb(250 - tone * 130, 252 - tone * 90, 255 - tone * 60));
    gradient.addColorStop(1, rgb(224 - tone * 90, 231 - tone * 70, 241 - tone * 50));
    context.fillStyle = gradient;
    context.strokeStyle = "rgba(51, 65, 85, 0.38)";
    context.lineWidth = 1.4;
    drawPolygon(context, points);
    context.fill();
    context.stroke();
  }
}

function drawPolygon(context, points) {
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) {
    context.lineTo(point.x, point.y);
  }
  context.closePath();
}

function convexHull(points) {
  const sorted = [...points].sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);
  if (sorted.length <= 1) {
    return sorted;
  }
  const lower = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), point) <= 0) {
      lower.pop();
    }
    lower.push(point);
  }
  const upper = [];
  for (const point of sorted.slice().reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), point) <= 0) {
      upper.pop();
    }
    upper.push(point);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function cross(origin, a, b) {
  return (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);
}

function rgb(red, green, blue) {
  return `rgb(${clampColor(red)}, ${clampColor(green)}, ${clampColor(blue)})`;
}

function clampColor(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
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
  els.stepDiagram.innerHTML = "";
  els.stepTabs.innerHTML = "";
  els.stepDetail.innerHTML = "";
  els.stepProgress.textContent = "0 steps";
  els.caseEvidence.innerHTML = "";
  els.caseEvidence.dataset.status = "empty";
  els.executorImage.removeAttribute("src");
  els.executorImage.alt = "";
  els.executorCaption.textContent = "No executor selected.";
  els.instructionLabel.textContent = "No executor selected.";
  els.proposalList.innerHTML = "";
  els.criticList.innerHTML = "";
  els.profileSelect.replaceChildren(new Option("Select executor", ""));
  els.profileSelect.disabled = true;
  state.currentArtifacts = null;
  state.currentPreview = null;
  state.currentAnimation = null;
  state.currentStepIndex = 0;
  if (state.animationTimer) {
    clearInterval(state.animationTimer);
    state.animationTimer = null;
  }
  setEmbodimentStatus("No case selected.");
  renderValidationStatus(null, null);
  renderPreview(null);
  disposeFoldedPreview("foldedPreview", els.foldedPreviewStage);
  disposeFoldedPreview("stepFoldedPreview", els.stepFoldedPreviewStage);
  els.foldedPreviewStage.hidden = true;
  els.previewCanvas.hidden = false;
  els.stepFoldedPreviewStage.hidden = true;
  els.stepPreviewCanvas.hidden = false;
  drawPreviewOnCanvas(els.stepPreviewCanvas, null);
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

function renderValidationStatus(pipelineCase, artifacts) {
  const external = pipelineCase?.external_validation ?? {};
  const quality = pipelineCase?.result_quality;
  const decision = artifacts?.displayDecision ?? pipelineCase?.display_decision;
  const rows = [
    ["Display", pipelineCase ? formatDisplayMode(decision?.display_mode ?? pipelineCase.display_mode ?? pipelineCase.result_quality?.display_mode) : "not loaded"],
    ["Decision", formatDisplayDecision(decision)],
    ["Local Preview", pipelineCase?.claim_status?.simulator_valid ? "simulator-valid" : "not completed"],
    ["Target Match", quality ? formatTargetMatchQuality(quality.target_match_status, artifacts?.targetMatch ?? external.target_match) : "not loaded"],
    ["Community FOLD", statusLabel(artifacts?.communityFoldValidation ?? external.community_fold)],
    ["Flat-Folder", statusLabel(artifacts?.flatFolderValidation ?? external.flat_folder)],
    ["Solver State", statusLabel(artifacts?.flatFolderState ?? external.flat_folder_state)],
    ["Simulator", statusLabel(artifacts?.origamiSimulatorPreview ?? external.community_preview)],
    ["Executor", pipelineCase?.executor_readable ? "profile executor-readable" : "not loaded"]
  ];
  els.validationStatus.replaceChildren(...rows.map(([label, value]) => {
    const wrapper = document.createElement("div");
    const term = document.createElement("dt");
    const desc = document.createElement("dd");
    term.textContent = label;
    desc.textContent = value;
    wrapper.append(term, desc);
    return wrapper;
  }));
}

function displayStateForCase(pipelineCase) {
  switch (pipelineCase?.display_mode) {
    case "completed-usable":
    case "completed-usable-generated":
      return "success";
    case "completed-3d-partial-walkthrough":
      return "partial";
    case "blocked-executor":
    case "blocked-solver":
    case "blocked-target-match":
    case "blocked-backend":
    case "rejected-target-match":
    case "rejected-step-state":
    case "rejected-executor-feasibility":
    case "inspection-only":
      return "partial";
    case "failed":
      return "failure";
    default:
      return pipelineCase?.status === "valid" ? "success" : "partial";
  }
}

function displayMessageForCase(pipelineCase) {
  const targetName = pipelineCase?.target?.name ?? "Case";
  switch (pipelineCase?.display_mode) {
    case "completed-usable":
      return `${targetName} completed with solver-backed 3D preview and full walkthrough evidence.`;
    case "completed-usable-generated":
      return `${targetName} is a generated candidate that passed solver-backed 3D preview, target match, full walkthrough, and executor evidence.`;
    case "completed-3d-partial-walkthrough":
      return `${targetName} has a solver-backed 3D preview, but the walkthrough is still partial.`;
    case "blocked-backend":
      return `${targetName} generated candidate is blocked by backend state evidence; showing inspection artifacts only.`;
    case "rejected-target-match":
      return `${targetName} generated candidate folded, but was rejected by target-match evidence.`;
    case "rejected-step-state":
      return `${targetName} generated candidate is rejected because step replay evidence is incomplete.`;
    case "rejected-executor-feasibility":
      return `${targetName} generated candidate is rejected for executor feasibility evidence.`;
    case "blocked-solver":
      return `${targetName} is blocked by solver evidence; showing inspection artifacts only.`;
    case "blocked-target-match":
      return `${targetName} is solver-backed but blocked by target-match evidence.`;
    case "blocked-executor":
      return `${targetName} is blocked for the selected executor evidence.`;
    case "inspection-only":
      return `${targetName} is inspection-only; no completed target display.`;
    case "failed":
      return `${targetName} failed before completed-result gates.`;
    default:
      return `${targetName} loaded.`;
  }
}

function displayModeTitle(displayMode) {
  switch (displayMode) {
    case "completed-usable":
      return "Completed usable origami result";
    case "completed-usable-generated":
      return "Generated completed usable origami result";
    case "completed-3d-partial-walkthrough":
      return "Completed 3D target with partial walkthrough";
    case "blocked-solver":
      return "Blocked by solver evidence";
    case "blocked-target-match":
      return "Blocked by target-match evidence";
    case "blocked-backend":
      return "Blocked by generated backend evidence";
    case "rejected-target-match":
      return "Rejected by generated target-match evidence";
    case "rejected-step-state":
      return "Rejected by generated step replay evidence";
    case "rejected-executor-feasibility":
      return "Rejected by generated executor feasibility";
    case "blocked-executor":
      return "Blocked by executor evidence";
    case "failed":
      return "Failed before completed-result display";
    default:
      return "Inspection-only result";
  }
}

function formatDisplayMode(displayMode) {
  switch (displayMode) {
    case "completed-usable":
      return "completed usable folded-state walkthrough";
    case "completed-usable-generated":
      return "generated completed usable folded-state walkthrough";
    case "completed-3d-partial-walkthrough":
      return "completed 3D folded-state render; walkthrough partial";
    case "blocked-solver":
      return "blocked by solver; inspection only";
    case "blocked-target-match":
      return "blocked by target match; inspection only";
    case "blocked-backend":
      return "blocked by generated backend; inspection only";
    case "rejected-target-match":
      return "generated rejected by target match";
    case "rejected-step-state":
      return "generated rejected by step replay";
    case "rejected-executor-feasibility":
      return "generated rejected by executor feasibility";
    case "blocked-executor":
      return "blocked by executor evidence";
    case "inspection-only":
      return "inspection only";
    case "failed":
      return "failed";
    default:
      return displayMode ?? "not loaded";
  }
}

function canRenderBackend3d(pipelineCase, artifacts = null) {
  const decision = artifacts?.displayDecision ?? pipelineCase?.display_decision;
  if (decision) {
    return decision.safe_to_render_3d_preview === true;
  }
  return pipelineCase?.display_mode === "completed-usable"
    || pipelineCase?.display_mode === "completed-usable-generated"
    || pipelineCase?.display_mode === "completed-3d-partial-walkthrough"
    || pipelineCase?.display_mode === "completed-3d";
}

function formatDisplayDecision(decision) {
  if (!decision) {
    return "display decision unavailable";
  }
  const weakest = decision.weakest_failed_gate ? `; weakest failed gate: ${decision.weakest_failed_gate}` : "";
  return `${formatTitle(decision.display_status ?? decision.display_mode)}${weakest}`;
}

function statusLabel(result) {
  if (!result) {
    return "not run";
  }
  const status = result.status ?? "unknown";
  const effect = result.claim_effect ? `: ${result.claim_effect}` : "";
  return `${status}${effect}`;
}

function formatTargetMatchQuality(status, targetMatch) {
  const score = typeof targetMatch?.score === "number" && typeof targetMatch?.threshold === "number"
    ? ` (${targetMatch.score.toFixed(3)} / ${targetMatch.threshold.toFixed(2)})`
    : "";
  switch (status) {
    case "target-match-passed":
      return `silhouette gate passed${score}`;
    case "target-match-failed":
      return `silhouette gate failed${score}`;
    case "target-match-blocked-by-solver":
      return "blocked until solver-backed folded state exists";
    case "target-match-unscored":
      return "not scored";
    default:
      return status ?? "not loaded";
  }
}

function formatFoldabilityQuality(status, flatFolder) {
  const solverStatus = flatFolder?.status ? `Flat-Folder ${flatFolder.status}` : "Flat-Folder not run";
  switch (status) {
    case "external-solver-passed":
      return `${solverStatus}; still not embodiment proof`;
    case "external-solver-failed":
      return `${solverStatus}; not a solver-verified fold`;
    default:
      return status ?? solverStatus;
  }
}

function formatPreviewQuality(status) {
  switch (status) {
    case "solver-backed-folded-state":
      return "solver-backed folded-state geometry";
    case "2.5d-inspection-only":
      return "2.5D inspection only; not physical simulation";
    default:
      return status ?? "not loaded";
  }
}

function formatFrameDifference(frameDifference) {
  if (!frameDifference) {
    return "frame difference unavailable";
  }
  return `${frameDifference.status}; changed vertices: ${frameDifference.changed_vertex_count}; max delta: ${frameDifference.max_vertex_delta}`;
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
  return assetUrl(path);
}

function assetUrl(path) {
  return new URL(path.replace(/^\/+/, ""), assetBase).href;
}

function resolveAssetBase() {
  const currentDir = new URL("./", window.location.href);
  if (currentDir.pathname.endsWith("/demo/")) {
    return new URL("../", currentDir);
  }
  return currentDir;
}

function projectVertices(vertices, width, height) {
  const raw = vertices.map((vertex) => ({
    index: vertex.index,
    x: (vertex.x - vertex.y) * 180,
    y: (vertex.x + vertex.y) * 72 - vertex.z * 150
  }));
  const bounds = raw.reduce((result, point) => ({
    minX: Math.min(result.minX, point.x),
    maxX: Math.max(result.maxX, point.x),
    minY: Math.min(result.minY, point.y),
    maxY: Math.max(result.maxY, point.y)
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  const padding = Math.max(28, Math.min(width, height) * 0.12);
  const scale = Math.min(
    (width - padding * 2) / Math.max(bounds.maxX - bounds.minX, 1),
    (height - padding * 2) / Math.max(bounds.maxY - bounds.minY, 1)
  );
  const offsetX = (width - (bounds.maxX - bounds.minX) * scale) / 2 - bounds.minX * scale;
  const offsetY = (height - (bounds.maxY - bounds.minY) * scale) / 2 - bounds.minY * scale;
  return new Map(raw.map((point) => [point.index, {
    x: offsetX + point.x * scale,
    y: offsetY + point.y * scale
  }]));
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

function referenceEdgeColor(assignment) {
  return assignment === "B" ? "#171717" : "rgba(100, 116, 139, 0.42)";
}

function edgeKey(edge) {
  return [...edge].sort((a, b) => a - b).join(":");
}

function formatPhase(phase) {
  return String(phase)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTitle(value) {
  return String(value)
    .split(/[-_ ]+/)
    .filter(Boolean)
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
