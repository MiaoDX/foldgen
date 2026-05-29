#!/usr/bin/env node
import { runCuratedPipeline } from "../src/index.mjs";

const outDir = process.argv[2] ?? "out/m14-known-good-targets";
const minimumCompletedTargets = Number(process.env.FOLDGEN_MIN_COMPLETED_TARGETS ?? 3);

try {
  const summary = await runCuratedPipeline({ outDir });
  const completedCases = summary.cases.filter((pipelineCase) => pipelineCase.status === "valid");
  const knownGoodCompleted = completedCases.filter((pipelineCase) => pipelineCase.case_id.startsWith("known-good-"));
  const boat = summary.cases.find((pipelineCase) => pipelineCase.case_id === "simple-boat");
  const errors = [];

  if (completedCases.length < minimumCompletedTargets) {
    errors.push(`expected at least ${minimumCompletedTargets} completed targets, got ${completedCases.length}`);
  }
  if (knownGoodCompleted.length < 4) {
    errors.push(`expected four known-good completed targets, got ${knownGoodCompleted.length}`);
  }
  for (const pipelineCase of completedCases) {
    if (!["completed-usable", "completed-usable-generated", "completed-3d-partial-walkthrough"].includes(pipelineCase.display_mode)) {
      errors.push(`${pipelineCase.case_id}: completed case must use a completed folded-state display mode`);
    }
    if (pipelineCase.external_validation?.flat_folder_state?.status !== "passed") {
      errors.push(`${pipelineCase.case_id}: completed case missing passed solver state`);
    }
    if (pipelineCase.external_validation?.target_match?.status !== "passed") {
      errors.push(`${pipelineCase.case_id}: completed case missing passed target match`);
    }
  }
  if (!boat) {
    errors.push("simple-boat missing from default pipeline");
  } else if (boat.status === "valid") {
    if (!["completed-usable", "completed-usable-generated", "completed-3d-partial-walkthrough"].includes(boat.display_mode) || boat.external_validation?.target_match?.status !== "passed") {
      errors.push("simple-boat may only be valid when it passes the hard completed gate");
    }
  } else if (boat.display_mode !== "blocked-solver") {
    errors.push(`simple-boat must remain visibly blocked unless completed, got ${boat.display_mode}`);
  }

  const result = {
    ok: errors.length === 0,
    outDir,
    minimum_completed_targets: minimumCompletedTargets,
    completed_case_count: completedCases.length,
    known_good_completed_count: knownGoodCompleted.length,
    completed_cases: completedCases.map(summarizeCase),
    boat: boat ? summarizeCase(boat) : null,
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

function summarizeCase(pipelineCase) {
  return {
    case_id: pipelineCase.case_id,
    status: pipelineCase.status,
    display_mode: pipelineCase.display_mode,
    flat_folder_state: pipelineCase.external_validation?.flat_folder_state?.status ?? "not-run",
    target_match: pipelineCase.external_validation?.target_match?.status ?? "not-run",
    target_match_score: pipelineCase.external_validation?.target_match?.score ?? 0
  };
}
