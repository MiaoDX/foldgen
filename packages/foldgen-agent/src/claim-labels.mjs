import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { validateExecutorReadableStep } from "../../fold-core/src/index.mjs";

const DEFAULT_SUMMARY_PATH = "out/m2-pipeline/summary.json";
const EXPECTED_CASE_LABEL = "simulator-valid / executor-readable / embodiment-untested";
const REQUIRED_EXECUTOR_PROFILES = ["human-hand", "two-finger-gripper", "cat-paw-profile", "dog-paw-profile"];
const REQUIRED_PUBLIC_LABELS = [
  {
    path: "README.md",
    includes: [
      EXPECTED_CASE_LABEL,
      "npm run validate:stage1",
      "npm run validate:embodiment"
    ]
  },
  {
    path: "demo/README.md",
    includes: [
      EXPECTED_CASE_LABEL,
      "does not call live model providers"
    ]
  },
  {
    path: "demo/app.js",
    includes: [
      "executor_profile",
      "renderActionFlow",
      "formatClaimStatus",
      "claim_status"
    ]
  },
  {
    path: "docs/launch/stage-1-launch-checklist.md",
    includes: [
      "Draft-only",
      "npm run validate:stage1",
      "npm run validate:embodiment",
      EXPECTED_CASE_LABEL
    ]
  },
  {
    path: "docs/blog/stage-1-mvp-draft.md",
    includes: [
      "Draft-only",
      EXPECTED_CASE_LABEL,
      "Related-work status"
    ]
  }
];
const BANNED_PUBLIC_PATTERNS = [
  {
    pattern: /\bembodiment status:\s*(validated|embodiment[- ]validated)\b/i,
    message: "embodiment status must not claim validation without a final record"
  },
  {
    pattern: /\bclaim status:\s*(validated|embodiment[- ]validated)\b/i,
    message: "claim status must not claim validation without a final record"
  },
  {
    pattern: /\bphysically executable\b/i,
    message: "public copy must not use physically executable as a default Stage 1 claim"
  }
];

export async function validateStage1ClaimLabels(options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const summaryPath = options.summaryPath ?? DEFAULT_SUMMARY_PATH;
  const publicLabels = options.publicLabels ?? REQUIRED_PUBLIC_LABELS;
  const errors = [];
  const warnings = [];

  for (const publicLabel of publicLabels) {
    await validatePublicSurface(rootDir, publicLabel, errors);
  }

  await validatePipelineSummary(rootDir, join(rootDir, summaryPath), errors, warnings);

  return {
    ok: errors.length === 0,
    status: errors.length === 0 ? "complete" : "failed",
    expected_case_label: EXPECTED_CASE_LABEL,
    summary_path: summaryPath,
    checked_public_surfaces: publicLabels.map((publicLabel) => publicLabel.path),
    errors,
    warnings
  };
}

async function validatePublicSurface(rootDir, publicLabel, errors) {
  const path = join(rootDir, publicLabel.path);
  let text;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    errors.push(`${publicLabel.path}: missing public claim surface (${error.message})`);
    return;
  }

  for (const expected of publicLabel.includes) {
    if (!includesNormalized(text, expected)) {
      errors.push(`${publicLabel.path}: missing required claim label "${expected}"`);
    }
  }
  for (const banned of BANNED_PUBLIC_PATTERNS) {
    if (banned.pattern.test(text)) {
      errors.push(`${publicLabel.path}: ${banned.message}`);
    }
  }
}

function includesNormalized(text, expected) {
  return normalizeText(text).includes(normalizeText(expected));
}

function normalizeText(text) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

async function validatePipelineSummary(rootDir, path, errors, warnings) {
  let summary;
  try {
    summary = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    errors.push(`${path}: missing or invalid M2 summary (${error.message})`);
    return;
  }

  const allCasesSimulatorValid = Array.isArray(summary.cases)
    && summary.cases.length > 0
    && summary.cases.every((pipelineCase) => pipelineCase.status === "valid" && pipelineCase.claim_status?.simulator_valid === true);
  validateClaimStatus(summary.claim_status, `${path}: summary`, { requireSimulatorValid: allCasesSimulatorValid, errors });
  if (!Array.isArray(summary.cases) || summary.cases.length < 5) {
    errors.push(`${path}: expected at least five pipeline cases`);
    return;
  }

  for (const pipelineCase of summary.cases) {
    validateClaimStatus(pipelineCase.claim_status, `${path}: ${pipelineCase.case_id ?? "<case>"}`, {
      requireSimulatorValid: pipelineCase.status === "valid" && pipelineCase.validation_status === true,
      errors
    });
    validateSolverBackedEvidence(pipelineCase, `${path}: ${pipelineCase.case_id ?? "<case>"}`, errors);
    await validateExecutorEvidence(rootDir, pipelineCase, `${path}: ${pipelineCase.case_id ?? "<case>"}`, errors);
    if (pipelineCase.claim_status?.final_record_path) {
      warnings.push(`${path}: ${pipelineCase.case_id} links a final record; run npm run validate:embodiment before launch copy`);
    }
  }
}

function validateSolverBackedEvidence(pipelineCase, label, errors) {
  if (pipelineCase.status === "valid") {
    if (pipelineCase.external_validation?.flat_folder?.status !== "passed") {
      errors.push(`${label}: valid completed-target cases require passed Flat-Folder validation`);
    }
    if (pipelineCase.external_validation?.flat_folder_state?.status !== "passed") {
      errors.push(`${label}: valid completed-target cases require solver-backed folded-state evidence`);
    }
    if (!pipelineCase.artifact_paths?.folded_state_fold) {
      errors.push(`${label}: valid completed-target cases require folded_state_fold artifact path`);
    }
    if (!pipelineCase.artifact_paths?.display_decision) {
      errors.push(`${label}: valid completed-target cases require display_decision artifact path`);
    }
    if (!["completed-usable", "completed-usable-generated", "completed-3d-partial-walkthrough"].includes(pipelineCase.display_mode)) {
      errors.push(`${label}: valid completed-target cases require a completed display decision mode`);
    }
    if ((pipelineCase.display_mode === "completed-usable" || pipelineCase.display_mode === "completed-usable-generated")
      && pipelineCase.display_decision?.completed_usable !== true) {
      errors.push(`${label}: completed usable display requires completed_usable display decision evidence`);
    }
    if (pipelineCase.display_mode === "completed-usable-generated" && pipelineCase.display_decision?.generated_usable !== true) {
      errors.push(`${label}: completed-usable-generated display requires generated_usable display decision evidence`);
    }
    if (pipelineCase.display_mode === "completed-3d-partial-walkthrough" && pipelineCase.display_decision?.safe_to_render_completed_card === true) {
      errors.push(`${label}: partial walkthrough cases cannot be safe_to_render_completed_card`);
    }
    if (pipelineCase.result_quality?.preview_status !== "solver-backed-folded-state") {
      errors.push(`${label}: valid completed-target cases must use solver-backed-folded-state preview status`);
    }
  }
  if (pipelineCase.external_validation?.flat_folder?.status === "failed" && pipelineCase.claim_status?.simulator_valid === true) {
    errors.push(`${label}: failed Flat-Folder validation cannot have simulator_valid=true`);
  }
}

function validateClaimStatus(claimStatus, label, { requireSimulatorValid, errors }) {
  if (!claimStatus || typeof claimStatus !== "object") {
    errors.push(`${label}: missing claim_status`);
    return;
  }
  if (requireSimulatorValid && claimStatus.claim_label !== EXPECTED_CASE_LABEL) {
    errors.push(`${label}: claim_label must be "${EXPECTED_CASE_LABEL}"`);
  }
  if (requireSimulatorValid && claimStatus.simulator_valid !== true) {
    errors.push(`${label}: simulator_valid must be true for valid Stage 1 cases`);
  }
  if (requireSimulatorValid && claimStatus.executor_readable !== true) {
    errors.push(`${label}: executor_readable must be true for valid Stage 1 cases`);
  }
  if (claimStatus.embodiment_validated !== false) {
    errors.push(`${label}: embodiment_validated must remain false until final records pass`);
  }
  if (claimStatus.embodiment_status !== "untested") {
    errors.push(`${label}: embodiment_status must be "untested" during Stage 1`);
  }
  if (claimStatus.final_record_path !== null) {
    errors.push(`${label}: final_record_path must be null until final-stage records are intentionally added`);
  }
}

async function validateExecutorEvidence(rootDir, pipelineCase, label, errors) {
  const requireEvidence = pipelineCase.status === "valid" && pipelineCase.validation_status === true;
  if (!requireEvidence) {
    return;
  }

  if (pipelineCase.executor_readable !== true) {
    errors.push(`${label}: executor_readable must be true`);
  }
  if (pipelineCase.executor_profile !== "human-hand") {
    errors.push(`${label}: executor_profile must be "human-hand" for curated Stage 1 cases`);
  }
  if (!Array.isArray(pipelineCase.executor_profiles) || !pipelineCase.executor_profiles.includes("human-hand")) {
    errors.push(`${label}: executor_profiles must include human-hand`);
  }
  for (const executorProfile of REQUIRED_EXECUTOR_PROFILES) {
    if (!pipelineCase.executor_profiles?.includes(executorProfile)) {
      errors.push(`${label}: executor_profiles must include ${executorProfile}`);
    }
  }

  const sequencePath = pipelineCase.artifact_paths?.diagram_sequence;
  if (!sequencePath) {
    errors.push(`${label}: missing diagram_sequence artifact path`);
    return;
  }

  let sequence;
  try {
    sequence = JSON.parse(await readFile(join(rootDir, sequencePath), "utf8"));
  } catch (error) {
    errors.push(`${label}: missing or invalid diagram sequence (${error.message})`);
    return;
  }

  if (sequence.type !== "foldgen.diagram_sequence.v1") {
    errors.push(`${label}: diagram sequence type must be foldgen.diagram_sequence.v1`);
  }
  if (sequence.executor_profile !== "human-hand") {
    errors.push(`${label}: diagram sequence executor_profile must be human-hand`);
  }
  if (!Array.isArray(sequence.steps) || sequence.steps.length === 0) {
    errors.push(`${label}: diagram sequence must contain at least one step`);
    return;
  }
  for (const [index, step] of sequence.steps.entries()) {
    const result = validateExecutorReadableStep(step);
    if (!result.ok) {
      errors.push(`${label}: diagram sequence step ${index + 1} is not executor-readable: ${result.errors.join("; ")}`);
    }
  }

  for (const executorProfile of REQUIRED_EXECUTOR_PROFILES) {
    const profilePath = pipelineCase.artifact_paths?.diagram_sequences?.[executorProfile];
    if (!profilePath) {
      errors.push(`${label}: missing ${executorProfile} diagram sequence`);
      continue;
    }
    await validateProfileSequence(rootDir, profilePath, executorProfile, label, errors);
  }
}

async function validateProfileSequence(rootDir, path, executorProfile, label, errors) {
  let sequence;
  try {
    sequence = JSON.parse(await readFile(join(rootDir, path), "utf8"));
  } catch (error) {
    errors.push(`${label}: missing or invalid ${executorProfile} diagram sequence (${error.message})`);
    return;
  }

  if (sequence.type !== "foldgen.diagram_sequence.v1") {
    errors.push(`${label}: ${executorProfile} diagram sequence type must be foldgen.diagram_sequence.v1`);
  }
  if (sequence.executor_profile !== executorProfile) {
    errors.push(`${label}: ${executorProfile} diagram sequence executor_profile must be ${executorProfile}`);
  }
  if (!Array.isArray(sequence.steps) || sequence.steps.length === 0) {
    errors.push(`${label}: ${executorProfile} diagram sequence must contain at least one step`);
    return;
  }
  for (const [index, step] of sequence.steps.entries()) {
    const result = validateExecutorReadableStep(step);
    if (!result.ok) {
      errors.push(`${label}: ${executorProfile} diagram sequence step ${index + 1} is not executor-readable: ${result.errors.join("; ")}`);
    }
  }
}
