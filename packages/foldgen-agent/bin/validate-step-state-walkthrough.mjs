#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { runCuratedPipeline } from "../src/index.mjs";

const outDir = process.argv[2] ?? "out/m15-step-state-walkthrough";

try {
  const summary = await runCuratedPipeline({ outDir });
  const errors = [];
  const cases = [];

  for (const pipelineCase of summary.cases ?? []) {
    const stepStates = JSON.parse(await readFile(join(outDir, pipelineCase.case_id, "step-states.json"), "utf8"));
    const stepVisuals = JSON.parse(await readFile(join(outDir, pipelineCase.case_id, "step-visuals.json"), "utf8"));
    const caseErrors = [];
    const solverBackedVisuals = (stepVisuals.steps ?? []).filter((step) => step.display_source === "flat-folder-step-state");

    if (stepStates.step_count !== pipelineCase.selected_operation_count) {
      caseErrors.push(`step-states step_count ${stepStates.step_count} does not match selected_operation_count ${pipelineCase.selected_operation_count}`);
    }
    if (stepStates.solver_backed_step_count !== solverBackedVisuals.length) {
      caseErrors.push("step visual solver-backed count does not match step-states artifact");
    }
    for (const step of solverBackedVisuals) {
      if (!step.step_state_path || !step.folded_state_path) {
        caseErrors.push(`step ${step.step}: missing solver-state or folded-state path`);
      }
      if (step.frame_difference?.status !== "changed" || step.frame_difference.changed_vertex_count <= 0) {
        caseErrors.push(`step ${step.step}: solver-backed visual lacks changed frame evidence`);
      }
    }
    if (pipelineCase.case_id.startsWith("known-good-")) {
      if (stepStates.status !== "complete") {
        caseErrors.push(`known-good case must have complete step states, got ${stepStates.status}`);
      }
      if (stepStates.solver_backed_step_count !== pipelineCase.selected_operation_count) {
        caseErrors.push("known-good case must have solver-backed state for every step");
      }
      if (stepVisuals.display_source_status !== "solver-backed-post-states") {
        caseErrors.push(`known-good step visuals must be solver-backed, got ${stepVisuals.display_source_status}`);
      }
    }
    if (pipelineCase.status === "valid" && stepStates.solver_backed_step_count < 1) {
      caseErrors.push("completed case must have at least one solver-backed walkthrough step state");
    }

    cases.push({
      case_id: pipelineCase.case_id,
      status: pipelineCase.status,
      display_mode: pipelineCase.display_mode,
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
  console.error(error.message);
  process.exitCode = 1;
}
