#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { runCuratedPipeline, stage1ExecutorProfiles } from "../src/index.mjs";

const outDir = process.argv[2] ?? "out/m21-full-step-states";

try {
  const summary = await runCuratedPipeline({ outDir });
  const errors = [];
  const cases = [];

  for (const pipelineCase of summary.cases ?? []) {
    const caseErrors = [];
    const caseDir = join(outDir, pipelineCase.case_id);
    const displayDecision = JSON.parse(await readFile(join(caseDir, "display-decision.json"), "utf8"));
    const stepStates = JSON.parse(await readFile(join(caseDir, "step-states.json"), "utf8"));
    const stepVisuals = JSON.parse(await readFile(join(caseDir, "step-visuals.json"), "utf8"));
    const sequence = JSON.parse(await readFile(join(caseDir, "diagram-sequence.json"), "utf8"));

    if (stepStates.step_count !== pipelineCase.selected_operation_count) {
      caseErrors.push("step-states step_count must match selected operation count");
    }
    if (stepVisuals.step_count !== pipelineCase.selected_operation_count) {
      caseErrors.push("step-visuals step_count must match selected operation count");
    }
    if (sequence.steps.length !== pipelineCase.selected_operation_count) {
      caseErrors.push("diagram sequence step count must match selected operation count");
    }
    for (let index = 0; index < sequence.steps.length; index += 1) {
      const expectedStepNumber = index + 1;
      if (sequence.steps[index].step !== expectedStepNumber) {
        caseErrors.push(`diagram step ${index} must preserve original step number ${expectedStepNumber}`);
      }
      for (const profile of stage1ExecutorProfiles) {
        const profileVisual = stepVisuals.profile_steps?.[profile]?.[index];
        if (!profileVisual) {
          caseErrors.push(`${profile}: missing step visual ${expectedStepNumber}`);
          continue;
        }
        if (profileVisual.step !== expectedStepNumber) {
          caseErrors.push(`${profile}: visual must preserve step number ${expectedStepNumber}`);
        }
        if (profileVisual.operation_id !== sequence.steps[index].operation_id) {
          caseErrors.push(`${profile}: visual operation must match diagram step ${expectedStepNumber}`);
        }
      }
    }

    if (displayDecision.display_mode === "completed-usable") {
      if (stepStates.status !== "complete") {
        caseErrors.push("completed-usable requires complete step-states");
      }
      if (stepStates.solver_backed_step_count !== pipelineCase.selected_operation_count) {
        caseErrors.push("completed-usable requires every selected step to be solver-backed");
      }
      const allVisualsSolverBacked = Object.values(stepVisuals.profile_steps ?? {})
        .flat()
        .every((step) => step.display_source === "flat-folder-step-state" && step.frame_difference?.status === "changed");
      if (!allVisualsSolverBacked) {
        caseErrors.push("completed-usable step visuals must all be solver-backed and visibly changed");
      }
    }

    if (displayDecision.display_mode === "completed-3d-partial-walkthrough") {
      if (displayDecision.weakest_failed_gate !== "step-state-walkthrough") {
        caseErrors.push("partial walkthrough mode must identify step-state-walkthrough as weakest failed gate");
      }
      if (stepStates.status === "complete") {
        caseErrors.push("partial walkthrough mode must not have complete step states");
      }
      if (stepVisuals.display_source_status !== "partial-solver-backed-post-states") {
        caseErrors.push("partial walkthrough visuals must be marked partial-solver-backed-post-states");
      }
    }

    if (["blocked-solver", "blocked-target-match", "inspection-only"].includes(displayDecision.display_mode)) {
      if (displayDecision.safe_to_render_completed_card === true) {
        caseErrors.push("blocked/inspection modes cannot render completed card");
      }
    }

    cases.push({
      case_id: pipelineCase.case_id,
      display_mode: displayDecision.display_mode,
      step_state_status: stepStates.status,
      solver_backed_step_count: stepStates.solver_backed_step_count,
      inspection_only_step_count: stepStates.inspection_only_step_count,
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
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}
