import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { validateExecutorReadableStep } from "../../fold-core/src/index.mjs";

const DEFAULT_SUMMARY_PATH = "out/m2-pipeline/summary.json";
const EXPECTED_CASE_LABEL = "simulator-valid / executor-readable / embodiment-untested";
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

  validateClaimStatus(summary.claim_status, `${path}: summary`, { requireSimulatorValid: summary.ok === true, errors });
  if (!Array.isArray(summary.cases) || summary.cases.length < 5) {
    errors.push(`${path}: expected at least five pipeline cases`);
    return;
  }

  for (const pipelineCase of summary.cases) {
    validateClaimStatus(pipelineCase.claim_status, `${path}: ${pipelineCase.case_id ?? "<case>"}`, {
      requireSimulatorValid: pipelineCase.status === "valid" && pipelineCase.validation_status === true,
      errors
    });
    await validateExecutorEvidence(rootDir, pipelineCase, `${path}: ${pipelineCase.case_id ?? "<case>"}`, errors);
    if (pipelineCase.claim_status?.final_record_path) {
      warnings.push(`${path}: ${pipelineCase.case_id} links a final record; run npm run validate:embodiment before launch copy`);
    }
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
}
