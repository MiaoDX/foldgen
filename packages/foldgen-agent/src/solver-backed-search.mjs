import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

import { stableStringify } from "../../fold-core/src/index.mjs";
import { runCuratedPipeline } from "./pipeline.mjs";

export async function runSolverBackedSearchGate(options = {}) {
  const outDir = options.outDir ?? "out/m23-solver-backed-search";
  const pipelineOutDir = join(outDir, "pipeline");
  await mkdir(outDir, { recursive: true });
  const pipelineSummary = await runCuratedPipeline({ outDir: pipelineOutDir });
  const cases = [];
  const errors = [];

  for (const pipelineCase of pipelineSummary.cases ?? []) {
    const caseDir = join(pipelineOutDir, pipelineCase.case_id);
    const proposalHistory = JSON.parse(await readFile(join(caseDir, "proposal-history.json"), "utf8"));
    const displayDecision = JSON.parse(await readFile(join(caseDir, "display-decision.json"), "utf8"));
    const targetMatch = JSON.parse(await readFile(join(caseDir, "target-match.json"), "utf8"));
    const searchRecord = buildSolverBackedSearchRecord({ pipelineCase, proposalHistory, displayDecision, targetMatch });
    const outputPath = join(outDir, pipelineCase.case_id, "solver-backed-search.json");
    await writeJson(outputPath, searchRecord);
    const caseErrors = validateSearchRecord({ pipelineCase, searchRecord });
    cases.push({
      case_id: pipelineCase.case_id,
      status: searchRecord.status,
      selected_candidate_id: searchRecord.selected_candidate_id,
      selected_display_mode: searchRecord.selected_display_mode,
      selected_score: searchRecord.selected_score,
      record_path: toRepoPath(outputPath),
      errors: caseErrors
    });
    errors.push(...caseErrors.map((error) => `${pipelineCase.case_id}: ${error}`));
  }

  const completedUsable = cases.filter((entry) => entry.selected_display_mode === "completed-usable");
  const completedGenerated = cases.filter((entry) => entry.selected_display_mode === "completed-usable-generated");
  if (completedUsable.length < 4) {
    errors.push(`expected at least four completed-usable solver-backed search selections, got ${completedUsable.length}`);
  }
  if (completedGenerated.length < 1) {
    errors.push("expected at least one completed-usable-generated solver-backed search selection");
  }
  const boat = cases.find((entry) => entry.case_id === "simple-boat");
  if (boat?.selected_display_mode !== "blocked-solver") {
    errors.push(`simple-boat search selection must remain blocked-solver, got ${boat?.selected_display_mode ?? "missing"}`);
  }

  const result = {
    type: "foldgen.solver_backed_search_summary.v1",
    ok: errors.length === 0,
    status: errors.length === 0 ? "passed" : "failed",
    outDir,
    completed_usable_selection_count: completedUsable.length,
    completed_usable_generated_selection_count: completedGenerated.length,
    cases,
    errors
  };
  await writeJson(join(outDir, "summary.json"), result);
  return result;
}

export function buildSolverBackedSearchRecord({ pipelineCase, proposalHistory, displayDecision, targetMatch }) {
  const selectedCandidateId = pipelineCase.selected_candidate_id;
  const candidates = (proposalHistory.candidates ?? []).map((candidate) => {
    const selected = candidate.candidate_id === selectedCandidateId;
    const validationPassed = candidate.validation_status === "valid";
    const hardGatePassed = selected && displayDecision.target_complete === true;
    const completedUsable = selected && displayDecision.completed_usable === true;
    const score = selected
      ? solverBackedScore({ pipelineCase, displayDecision, targetMatch })
      : validationPassed ? 0.1 : 0;
    return {
      candidate_id: candidate.candidate_id,
      selected,
      operation_ids: (candidate.operations ?? []).map((operation) => operation.id),
      validation_status: candidate.validation_status,
      solver_state_status: selected ? pipelineCase.external_validation.flat_folder_state.status : "not-run",
      target_match_status: selected ? pipelineCase.external_validation.target_match.status : "not-run",
      step_state_status: selected ? pipelineCase.external_validation.step_states.status : "not-run",
      executor_overlay_status: selected ? pipelineCase.external_validation.executor_overlays.status : "not-run",
      display_mode: selected ? displayDecision.display_mode : "rejected-not-selected",
      hard_gate_passed: hardGatePassed,
      completed_usable: completedUsable,
      rejection_reason: selected ? null : validationPassed ? "lower-ranked-local-candidate-not-solver-scored" : "local-validation-failed",
      score
    };
  }).sort((a, b) => b.score - a.score || a.candidate_id.localeCompare(b.candidate_id));
  const selected = candidates.find((candidate) => candidate.selected) ?? null;
  return {
    type: "foldgen.solver_backed_search.v1",
    case_id: pipelineCase.case_id,
    status: selected ? "selected" : "blocked-no-selection",
    selected_candidate_id: selected?.candidate_id ?? null,
    selected_display_mode: selected?.display_mode ?? "failed",
    selected_score: selected?.score ?? 0,
    display_decision_path: pipelineCase.artifact_paths.display_decision,
    folded_state_path: pipelineCase.artifact_paths.folded_state_fold,
    target_match_path: pipelineCase.artifact_paths.target_match,
    step_states_path: pipelineCase.artifact_paths.step_states,
    executor_overlays_path: pipelineCase.artifact_paths.executor_overlays,
    candidates,
    selection_policy: [
      "candidate must pass local validation before solver scoring",
      "selected candidate display mode comes from display-decision.json",
      "completed-usable and completed-usable-generated require solver state, target match, full step states, and executor overlays",
      "blocked candidates remain available as search evidence but cannot drive completed display"
    ]
  };
}

function validateSearchRecord({ pipelineCase, searchRecord }) {
  const errors = [];
  if (searchRecord.selected_candidate_id !== pipelineCase.selected_candidate_id) {
    errors.push("search selected candidate id must match pipeline selected candidate id");
  }
  if (searchRecord.selected_display_mode !== pipelineCase.display_mode) {
    errors.push("search selected display mode must match pipeline display mode");
  }
  const selected = searchRecord.candidates.find((candidate) => candidate.selected);
  if (!selected) {
    errors.push("search record must identify a selected candidate");
    return errors;
  }
  if ((pipelineCase.display_mode === "completed-usable" || pipelineCase.display_mode === "completed-usable-generated")
    && selected.completed_usable !== true) {
    errors.push("completed usable display must select a completed_usable search candidate");
  }
  if (pipelineCase.display_mode === "completed-3d-partial-walkthrough" && selected.step_state_status === "complete") {
    errors.push("partial walkthrough search candidate should not have complete step states");
  }
  if (pipelineCase.display_mode.startsWith("blocked-") && selected.hard_gate_passed === true) {
    errors.push("blocked display mode cannot have hard_gate_passed search candidate");
  }
  if (selected.display_mode !== pipelineCase.display_mode) {
    errors.push("selected candidate display mode mismatch");
  }
  return errors;
}

function solverBackedScore({ pipelineCase, displayDecision, targetMatch }) {
  let score = 0;
  if (pipelineCase.validation_status) {
    score += 0.1;
  }
  if (pipelineCase.external_validation.flat_folder_state.status === "passed") {
    score += 0.25;
  }
  if (targetMatch.status === "passed") {
    score += Math.min(0.25, Number(targetMatch.score ?? 0) * 0.25);
  }
  if (pipelineCase.external_validation.step_states.status === "complete") {
    score += 0.2;
  } else if (pipelineCase.external_validation.step_states.status === "partial") {
    score += 0.08;
  }
  if (pipelineCase.external_validation.executor_overlays.status === "complete") {
    score += 0.1;
  }
  if (displayDecision.completed_usable) {
    score += 0.1;
  }
  return round(score);
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${stableStringify(value, 2)}\n`, "utf8");
}

function toRepoPath(path) {
  return relative(process.cwd(), path).split("\\").join("/");
}

function round(value) {
  return Number(value.toFixed(4));
}
