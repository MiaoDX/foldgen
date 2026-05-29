import { relative } from "node:path";

export const completedDisplayModes = new Set([
  "completed-usable",
  "completed-usable-generated",
  "completed-3d-partial-walkthrough"
]);

export function createDisplayDecision({
  caseId,
  selected,
  selectedValidation,
  communityFoldValidation,
  flatFolderValidation,
  flatFolderState,
  targetMatch,
  stepStates,
  stepVisuals,
  executorOverlays,
  executorReadable,
  executorProfiles = [],
  selectedExecutorProfile = "human-hand",
  artifactPaths = {}
}) {
  const stepCount = stepStates?.step_count ?? stepVisuals?.step_count ?? 0;
  const overlayCoverage = summarizeExecutorOverlayCoverage({
    stepVisuals,
    executorOverlays,
    executorProfiles,
    stepCount
  });
  const gates = [
    gate({
      id: "candidate-selected",
      status: selected ? "passed" : "failed",
      requiredFor: ["completed-3d-partial-walkthrough", "completed-usable", "completed-usable-generated"],
      artifactPath: artifactPaths.derived_fold ?? null,
      evidence: {
        selected_candidate_id: selected?.candidate_id ?? null,
        origin_kind: selected?.origin_kind ?? "curated-profile-candidate"
      }
    }),
    gate({
      id: "local-fold-validation",
      status: selectedValidation?.ok ? "passed" : "failed",
      requiredFor: ["completed-3d-partial-walkthrough", "completed-usable", "completed-usable-generated"],
      artifactPath: artifactPaths.validation ?? null,
      evidence: {
        errors: selectedValidation?.errors ?? []
      }
    }),
    gate({
      id: "community-fold-compatibility",
      status: communityFoldValidation?.status === "passed" ? "passed" : "failed",
      requiredFor: ["completed-3d-partial-walkthrough", "completed-usable", "completed-usable-generated"],
      artifactPath: artifactPaths.community_fold_validation ?? null,
      evidence: {
        status: communityFoldValidation?.status ?? "not-run"
      }
    }),
    gate({
      id: "flat-folder-validation",
      status: flatFolderValidation?.status === "passed" ? "passed" : "failed",
      requiredFor: ["completed-3d-partial-walkthrough", "completed-usable", "completed-usable-generated"],
      artifactPath: artifactPaths.flat_folder_validation ?? null,
      evidence: {
        status: flatFolderValidation?.status ?? "not-run",
        errors: flatFolderValidation?.errors ?? []
      }
    }),
    gate({
      id: "folded-state-artifact",
      status: flatFolderState?.status === "passed" && artifactPaths.folded_state_fold ? "passed" : "failed",
      requiredFor: ["completed-3d-partial-walkthrough", "completed-usable", "completed-usable-generated"],
      artifactPath: artifactPaths.folded_state_fold ?? null,
      evidence: {
        status: flatFolderState?.status ?? "not-run",
        folded_vertex_count: flatFolderState?.folded_vertex_count ?? 0,
        face_order_count: flatFolderState?.face_order_count ?? 0,
        conflict: flatFolderState?.conflict ?? null
      }
    }),
    gate({
      id: "target-match",
      status: targetMatch?.status === "passed" ? "passed" : "failed",
      requiredFor: ["completed-3d-partial-walkthrough", "completed-usable", "completed-usable-generated"],
      artifactPath: artifactPaths.target_match ?? null,
      evidence: {
        status: targetMatch?.status ?? "not-run",
        score: targetMatch?.score ?? 0,
        threshold: targetMatch?.threshold ?? null,
        blocker: targetMatch?.blocker ?? null
      }
    }),
    gate({
      id: "step-state-walkthrough",
      status: isCompleteStepStateWalkthrough(stepStates) ? "passed" : "failed",
      requiredFor: ["completed-usable", "completed-usable-generated"],
      artifactPath: artifactPaths.step_states ?? null,
      evidence: {
        status: stepStates?.status ?? "missing",
        step_count: stepStates?.step_count ?? 0,
        solver_backed_step_count: stepStates?.solver_backed_step_count ?? 0,
        inspection_only_step_count: stepStates?.inspection_only_step_count ?? 0
      }
    }),
    gate({
      id: "executor-readable",
      status: executorReadable ? "passed" : "failed",
      requiredFor: ["completed-usable", "completed-usable-generated"],
      artifactPath: artifactPaths.diagram_sequence ?? null,
      evidence: {
        selected_executor_profile: selectedExecutorProfile,
        executor_profiles: executorProfiles
      }
    }),
    gate({
      id: "executor-overlays",
      status: overlayCoverage.status === "complete" ? "passed" : "failed",
      requiredFor: ["completed-usable", "completed-usable-generated"],
      artifactPath: artifactPaths.step_visuals ?? null,
      evidence: overlayCoverage
    }),
    gate({
      id: "generated-candidate-recipe",
      status: selected?.origin_kind === "generated-candidate" && artifactPaths.candidate_recipe ? "passed" : "failed",
      requiredFor: ["completed-usable-generated"],
      artifactPath: artifactPaths.candidate_recipe ?? null,
      evidence: {
        origin_kind: selected?.origin_kind ?? "curated-profile-candidate",
        candidate_recipe: artifactPaths.candidate_recipe ?? null
      }
    })
  ];

  const targetComplete = requiredGatesPassed(gates, "completed-3d-partial-walkthrough");
  const usableComplete = targetComplete && requiredGatesPassed(gates, "completed-usable");
  const generatedUsableComplete = targetComplete && requiredGatesPassed(gates, "completed-usable-generated");
  const displayMode = selectDisplayModeFromGates({
    selected,
    gates,
    targetComplete,
    usableComplete,
    generatedUsableComplete
  });
  const failedGate = firstFailedRequiredGate(gates, displayMode);

  return {
    type: "foldgen.display_decision.v1",
    case_id: caseId,
    display_mode: displayMode,
    display_status: displayStatusForMode(displayMode),
    target_complete: targetComplete,
    completed_usable: displayMode === "completed-usable" || displayMode === "completed-usable-generated",
    generated_usable: displayMode === "completed-usable-generated",
    safe_to_render_completed_card: displayMode === "completed-usable" || displayMode === "completed-usable-generated",
    safe_to_render_3d_preview: targetComplete,
    render_source: targetComplete ? "folded-state.fold" : "inspection-preview",
    selected_executor_profile: selectedExecutorProfile,
    selected_candidate_id: selected?.candidate_id ?? null,
    weakest_failed_gate: failedGate?.id ?? null,
    gates,
    artifact_paths: {
      display_decision: artifactPaths.display_decision ?? null,
      folded_state_fold: artifactPaths.folded_state_fold ?? null,
      target_match: artifactPaths.target_match ?? null,
      step_states: artifactPaths.step_states ?? null,
      step_visuals: artifactPaths.step_visuals ?? null
    },
    summary: displaySummaryForMode(displayMode, failedGate)
  };
}

export function summarizeExecutorOverlayCoverage({ stepVisuals, executorOverlays = null, executorProfiles = [], stepCount = 0 }) {
  if (executorOverlays) {
    return {
      status: executorOverlays.status,
      profile_count: executorOverlays.profile_count,
      required_step_count: executorOverlays.step_count,
      artifact_path: executorOverlays.output_path ?? null,
      profiles: executorOverlays.profiles
    };
  }
  const profiles = executorProfiles.length > 0
    ? executorProfiles
    : Object.keys(stepVisuals?.profile_steps ?? {});
  const profile_summaries = profiles.map((profile) => {
    const steps = stepVisuals?.profile_steps?.[profile] ?? [];
    const missingSteps = [];
    const invalidSteps = [];
    for (let index = 0; index < stepCount; index += 1) {
      const step = steps[index];
      if (!step) {
        missingSteps.push(index + 1);
        continue;
      }
      const overlay = step.executor_overlay;
      const hasBinding = overlay?.geometry_binding?.operation_id === step.operation_id;
      const hasZones = Array.isArray(overlay?.zones) && overlay.zones.length > 0;
      if (!hasBinding || !hasZones) {
        invalidSteps.push({
          step: step.step ?? index + 1,
          operation_id: step.operation_id ?? null,
          has_geometry_binding: hasBinding,
          has_zones: hasZones
        });
      }
    }
    return {
      profile,
      status: steps.length >= stepCount && missingSteps.length === 0 && invalidSteps.length === 0
        ? "complete"
        : "incomplete",
      step_count: steps.length,
      required_step_count: stepCount,
      missing_steps: missingSteps,
      invalid_steps: invalidSteps
    };
  });
  const complete = stepCount > 0
    && profile_summaries.length > 0
    && profile_summaries.every((profile) => profile.status === "complete");
  return {
    status: complete ? "complete" : "incomplete",
    profile_count: profile_summaries.length,
    required_step_count: stepCount,
    profiles: profile_summaries
  };
}

export function isCompleteStepStateWalkthrough(stepStates) {
  return stepStates?.status === "complete"
    && stepStates.step_count > 0
    && stepStates.solver_backed_step_count === stepStates.step_count
    && stepStates.inspection_only_step_count === 0;
}

export function isCompletedDisplayMode(displayMode) {
  return completedDisplayModes.has(displayMode);
}

function gate({ id, status, requiredFor, artifactPath, evidence }) {
  return {
    id,
    status,
    required_for: requiredFor,
    artifact_path: artifactPath,
    evidence
  };
}

function requiredGatesPassed(gates, mode) {
  return gates
    .filter((gate) => gate.required_for.includes(mode))
    .every((gate) => gate.status === "passed");
}

function firstFailedRequiredGate(gates, displayMode) {
  const mode = displayMode === "completed-usable-generated" || displayMode?.startsWith("rejected-") || displayMode === "blocked-backend"
    ? "completed-usable-generated"
    : displayMode === "completed-3d-partial-walkthrough"
    ? "completed-usable"
    : displayMode === "completed-usable"
      ? "completed-usable"
      : "completed-3d-partial-walkthrough";
  return gates.find((gate) => gate.required_for.includes(mode) && gate.status !== "passed") ?? null;
}

function selectDisplayModeFromGates({ selected, gates, targetComplete, usableComplete, generatedUsableComplete }) {
  const generated = selected?.origin_kind === "generated-candidate";
  if (!selected || gateStatus(gates, "candidate-selected") !== "passed" || gateStatus(gates, "local-fold-validation") !== "passed") {
    return "failed";
  }
  if (gateStatus(gates, "community-fold-compatibility") !== "passed"
    || gateStatus(gates, "flat-folder-validation") !== "passed"
    || gateStatus(gates, "folded-state-artifact") !== "passed") {
    return generated ? "blocked-backend" : "blocked-solver";
  }
  if (gateStatus(gates, "target-match") !== "passed") {
    return generated ? "rejected-target-match" : "blocked-target-match";
  }
  if (!targetComplete) {
    return "inspection-only";
  }
  if (gateStatus(gates, "step-state-walkthrough") !== "passed") {
    return generated ? "rejected-step-state" : "completed-3d-partial-walkthrough";
  }
  if (gateStatus(gates, "executor-readable") !== "passed" || gateStatus(gates, "executor-overlays") !== "passed") {
    return generated ? "rejected-executor-feasibility" : "blocked-executor";
  }
  if (generated) {
    return generatedUsableComplete ? "completed-usable-generated" : "inspection-only";
  }
  return usableComplete ? "completed-usable" : "inspection-only";
}

function gateStatus(gates, id) {
  return gates.find((gate) => gate.id === id)?.status ?? "missing";
}

function displayStatusForMode(displayMode) {
  if (displayMode === "completed-usable" || displayMode === "completed-usable-generated") {
    return "success";
  }
  if (displayMode === "completed-3d-partial-walkthrough") {
    return "partial";
  }
  if (displayMode.startsWith("blocked-") || displayMode.startsWith("rejected-")) {
    return "blocked";
  }
  if (displayMode === "failed") {
    return "failed";
  }
  return "inspection-only";
}

function displaySummaryForMode(displayMode, failedGate) {
  switch (displayMode) {
    case "completed-usable":
      return "All completed-usable gates passed: backend state, target match, full step states, and executor overlays.";
    case "completed-usable-generated":
      return "Generated candidate graduated through backend state, target match, full step replay, and executor feasibility gates.";
    case "completed-3d-partial-walkthrough":
      return "Final solver-backed 3D target passes, but walkthrough evidence is incomplete.";
    case "blocked-backend":
      return "Generated candidate is blocked because backend folded-state evidence is missing or failed.";
    case "rejected-target-match":
      return "Generated candidate folds, but the backend-rendered shape does not match the target.";
    case "rejected-step-state":
      return "Generated candidate folds and matches the target, but the step replay is incomplete.";
    case "rejected-executor-feasibility":
      return "Generated candidate geometry passes, but executor feasibility evidence is incomplete or unsupported.";
    case "blocked-solver":
      return "Solver or folded-state evidence is missing or failed.";
    case "blocked-target-match":
      return "Folded-state evidence exists, but target-match failed.";
    case "blocked-executor":
      return "Geometry gates pass, but executor evidence is missing or unsupported.";
    case "failed":
      return "No valid local candidate reached the display gates.";
    default:
      return failedGate
        ? `Inspection-only because ${failedGate.id} did not pass.`
        : "Inspection-only debug artifact.";
  }
}

export function artifactPath(path) {
  return relative(process.cwd(), path).split("\\").join("/");
}
