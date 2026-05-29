#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { runCuratedPipeline, stage1ExecutorProfiles } from "../src/index.mjs";

const outDir = process.argv[2] ?? "out/m13-display-modes";

try {
  const summary = await runCuratedPipeline({ outDir });
  const cases = [];
  const errors = [];

  for (const pipelineCase of summary.cases ?? []) {
    const caseErrors = [];
    const expectedDisplayMode = expectedMode(pipelineCase);
    if (pipelineCase.display_mode !== expectedDisplayMode) {
      caseErrors.push(`display_mode expected ${expectedDisplayMode}, got ${pipelineCase.display_mode}`);
    }
    if (pipelineCase.status === "valid" && !["completed-usable", "completed-usable-generated", "completed-3d-partial-walkthrough"].includes(pipelineCase.display_mode)) {
      caseErrors.push("valid case must use a completed folded-state display mode");
    }
    if (pipelineCase.status !== "valid" && ["completed-usable", "completed-usable-generated", "completed-3d-partial-walkthrough"].includes(pipelineCase.display_mode)) {
      caseErrors.push("blocked/failed case must not use a completed folded-state display mode");
    }

    const stepVisuals = JSON.parse(await readFile(join(outDir, pipelineCase.case_id, "step-visuals.json"), "utf8"));
    if (!stepVisuals.annotation_legend?.some((entry) => entry.key === "active-fold-line")) {
      caseErrors.push("missing active-fold-line legend");
    }
    if (!stepVisuals.annotation_legend?.some((entry) => entry.key === "executor-contact-overlay")) {
      caseErrors.push("missing executor-contact-overlay legend");
    }
    if (!stage1ExecutorProfiles.every((profile) => Array.isArray(stepVisuals.profile_steps?.[profile]))) {
      caseErrors.push("missing profile-specific step visuals");
    }
    if (!stepVisuals.step_state_artifact_path) {
      caseErrors.push("missing step-state artifact link");
    }
    if ((stepVisuals.steps ?? []).some((step) => /stroke-dasharray/.test(step.svg))) {
      caseErrors.push("step SVG contains unlabeled dashed reference lines");
    }

    for (const profile of stage1ExecutorProfiles) {
      const firstStep = stepVisuals.profile_steps?.[profile]?.[0];
      if (!firstStep?.executor_overlay?.geometry_binding?.operation_id) {
        caseErrors.push(`${profile}: missing executor overlay geometry binding`);
      }
      if (!Array.isArray(firstStep?.executor_overlay?.zones) || firstStep.executor_overlay.zones.length === 0) {
        caseErrors.push(`${profile}: missing executor overlay zones`);
      }
    }

    const pawProfiles = ["cat-paw-profile", "dog-paw-profile"];
    for (const profile of pawProfiles) {
      const overlay = stepVisuals.profile_steps?.[profile]?.[0]?.executor_overlay;
      if (overlay?.status !== "precision-actions-blocked-or-fixture-needed") {
        caseErrors.push(`${profile}: paw precision status missing`);
      }
      if (!overlay?.zones?.some((zone) => zone.primitive === "blocked-precision")) {
        caseErrors.push(`${profile}: blocked precision zone missing`);
      }
    }

    cases.push({
      case_id: pipelineCase.case_id,
      status: pipelineCase.status,
      display_mode: pipelineCase.display_mode,
      expected_display_mode: expectedDisplayMode,
      step_visual_profiles: Object.keys(stepVisuals.profile_steps ?? {}),
      errors: caseErrors
    });
    errors.push(...caseErrors.map((error) => `${pipelineCase.case_id}: ${error}`));
  }

  const result = {
    ok: errors.length === 0,
    outDir,
    case_count: cases.length,
    cases,
    errors
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

function expectedMode(pipelineCase) {
  if (pipelineCase.status === "valid") {
    return pipelineCase.external_validation?.step_states?.status === "complete"
      ? pipelineCase.generated_candidate === true
        ? "completed-usable-generated"
        : "completed-usable"
      : "completed-3d-partial-walkthrough";
  }
  if (pipelineCase.external_validation?.flat_folder_state?.status !== "passed") {
    return "blocked-solver";
  }
  if (pipelineCase.external_validation?.target_match?.status !== "passed") {
    return "blocked-target-match";
  }
  return "inspection-only";
}
