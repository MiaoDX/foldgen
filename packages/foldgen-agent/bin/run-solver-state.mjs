#!/usr/bin/env node
import { runCuratedPipeline } from "../src/index.mjs";

const outDir = process.argv[2] ?? "out/m12-solver-state";

try {
  const summary = await runCuratedPipeline({ outDir });
  const completedCases = summary.cases.filter((pipelineCase) => pipelineCase.status === "valid");
  const blockedCases = summary.cases.filter((pipelineCase) => pipelineCase.status !== "valid");
  const result = {
    ok: completedCases.length > 0
      && summary.cases.every((pipelineCase) => (
        pipelineCase.status !== "valid"
          || pipelineCase.external_validation?.flat_folder_state?.status === "passed"
      )),
    outDir,
    case_count: summary.case_count,
    completed_case_count: completedCases.length,
    blocked_case_count: blockedCases.length,
    completed_cases: completedCases.map(summarizeCase),
    blocked_cases: blockedCases.map(summarizeCase)
  };

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

function summarizeCase(pipelineCase) {
  return {
    case_id: pipelineCase.case_id,
    status: pipelineCase.status,
    status_reason: pipelineCase.status_reason,
    flat_folder: pipelineCase.external_validation?.flat_folder?.status ?? "not-run",
    flat_folder_state: pipelineCase.external_validation?.flat_folder_state?.status ?? "not-run",
    display_mode: pipelineCase.display_mode,
    display_decision: pipelineCase.display_decision,
    folded_state_path: pipelineCase.external_validation?.flat_folder_state?.folded_state_path ?? null,
    conflict: pipelineCase.external_validation?.flat_folder_state?.conflict ?? null,
    preview_status: pipelineCase.result_quality?.preview_status ?? "unknown",
    target_match_status: pipelineCase.result_quality?.target_match_status ?? "unknown"
  };
}
