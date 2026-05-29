#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { runCuratedPipeline, stage1ExecutorProfiles } from "../src/index.mjs";

const outDir = process.argv[2] ?? "out/m18-display-decision";

try {
  const summary = await runCuratedPipeline({ outDir });
  const errors = [];
  const cases = [];

  for (const pipelineCase of summary.cases ?? []) {
    const caseErrors = [];
    const displayDecision = JSON.parse(await readFile(join(outDir, pipelineCase.case_id, "display-decision.json"), "utf8"));
    const stepStates = JSON.parse(await readFile(join(outDir, pipelineCase.case_id, "step-states.json"), "utf8"));
    const stepVisuals = JSON.parse(await readFile(join(outDir, pipelineCase.case_id, "step-visuals.json"), "utf8"));

    if (pipelineCase.artifact_paths.display_decision !== `${outDir}/${pipelineCase.case_id}/display-decision.json`) {
      caseErrors.push("summary artifact path must include display-decision.json");
    }
    if (pipelineCase.display_mode !== displayDecision.display_mode) {
      caseErrors.push(`summary display_mode ${pipelineCase.display_mode} does not match display decision ${displayDecision.display_mode}`);
    }
    if (pipelineCase.display_decision?.display_mode !== displayDecision.display_mode) {
      caseErrors.push("summary display_decision does not mirror artifact display mode");
    }
    if (pipelineCase.result_quality?.display_mode !== displayDecision.display_mode) {
      caseErrors.push("result_quality display mode must come from display decision");
    }
    if (displayDecision.safe_to_render_completed_card && displayDecision.display_mode !== "completed-usable") {
      caseErrors.push("only completed-usable may be safe_to_render_completed_card");
    }
    if (displayDecision.safe_to_render_3d_preview && pipelineCase.status !== "valid") {
      caseErrors.push("safe_to_render_3d_preview requires final solver-backed valid status");
    }
    if (displayDecision.display_mode === "completed-usable") {
      assertGatePassed(displayDecision, "folded-state-artifact", caseErrors);
      assertGatePassed(displayDecision, "target-match", caseErrors);
      assertGatePassed(displayDecision, "step-state-walkthrough", caseErrors);
      assertGatePassed(displayDecision, "executor-overlays", caseErrors);
      if (stepStates.status !== "complete") {
        caseErrors.push("completed-usable requires complete step-states artifact");
      }
      if (!allProfilesHaveBoundOverlays(stepVisuals, pipelineCase.selected_operation_count)) {
        caseErrors.push("completed-usable requires geometry-bound overlays for every profile and step");
      }
    }
    if (displayDecision.display_mode === "completed-3d-partial-walkthrough") {
      assertGatePassed(displayDecision, "folded-state-artifact", caseErrors);
      assertGatePassed(displayDecision, "target-match", caseErrors);
      assertGateFailed(displayDecision, "step-state-walkthrough", caseErrors);
      if (stepStates.status === "complete") {
        caseErrors.push("partial walkthrough mode must not have complete step states");
      }
    }
    if (pipelineCase.case_id === "simple-fish" && displayDecision.display_mode !== "completed-3d-partial-walkthrough") {
      caseErrors.push(`simple-fish must be downgraded to completed-3d-partial-walkthrough until all prefixes are solver-backed, got ${displayDecision.display_mode}`);
    }
    if (pipelineCase.case_id.startsWith("known-good-") && displayDecision.display_mode !== "completed-usable") {
      caseErrors.push(`known-good single-step case must be completed-usable, got ${displayDecision.display_mode}`);
    }
    if (pipelineCase.case_id === "simple-boat" && displayDecision.display_mode !== "blocked-solver") {
      caseErrors.push(`simple-boat must remain blocked by solver evidence, got ${displayDecision.display_mode}`);
    }

    cases.push({
      case_id: pipelineCase.case_id,
      status: pipelineCase.status,
      display_mode: pipelineCase.display_mode,
      target_complete: displayDecision.target_complete,
      completed_usable: displayDecision.completed_usable,
      weakest_failed_gate: displayDecision.weakest_failed_gate,
      step_state_status: stepStates.status,
      errors: caseErrors
    });
    errors.push(...caseErrors.map((error) => `${pipelineCase.case_id}: ${error}`));
  }

  if (summary.completed_usable_case_count < 4) {
    errors.push(`summary: expected at least four completed-usable cases, got ${summary.completed_usable_case_count}`);
  }
  if (summary.completed_3d_partial_walkthrough_case_count < 1) {
    errors.push("summary: expected at least one completed-3d-partial-walkthrough case");
  }

  const result = {
    ok: errors.length === 0,
    outDir,
    case_count: cases.length,
    completed_case_count: summary.completed_case_count,
    completed_usable_case_count: summary.completed_usable_case_count,
    completed_3d_partial_walkthrough_case_count: summary.completed_3d_partial_walkthrough_case_count,
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

function assertGatePassed(displayDecision, gateId, errors) {
  const gate = displayDecision.gates.find((candidate) => candidate.id === gateId);
  if (gate?.status !== "passed") {
    errors.push(`${gateId} gate must pass`);
  }
}

function assertGateFailed(displayDecision, gateId, errors) {
  const gate = displayDecision.gates.find((candidate) => candidate.id === gateId);
  if (gate?.status !== "failed") {
    errors.push(`${gateId} gate must fail`);
  }
}

function allProfilesHaveBoundOverlays(stepVisuals, stepCount) {
  return stage1ExecutorProfiles.every((profile) => {
    const steps = stepVisuals.profile_steps?.[profile] ?? [];
    return steps.length === stepCount && steps.every((step) => (
      step.executor_overlay?.geometry_binding?.operation_id === step.operation_id
        && Array.isArray(step.executor_overlay?.zones)
        && step.executor_overlay.zones.length > 0
    ));
  });
}
