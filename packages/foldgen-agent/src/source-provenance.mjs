export const knownGoodTutorialCaseIds = new Set([
  "known-good-triangle",
  "known-good-corner",
  "known-good-paper-hat",
  "known-good-square-packet"
]);

export const recognizableKnownGoodCaseIds = new Set([
  "known-good-paper-hat",
  "known-good-square-packet"
]);

export const generatedCandidateCaseIds = new Set([
  "generated-triangle"
]);

export function createSourceProvenance({ pipelineCase, pipelineOutDir }) {
  const knownGood = knownGoodTutorialCaseIds.has(pipelineCase.case_id);
  const generated = generatedCandidateCaseIds.has(pipelineCase.case_id) || pipelineCase.generated_candidate === true;
  const targetComplete = pipelineCase.status === "valid";
  const completedUsable = pipelineCase.display_mode === "completed-usable";
  const completedGenerated = pipelineCase.display_mode === "completed-usable-generated";
  const sourceKind = knownGood
    ? "repo-authored-solver-derived-fixture"
    : generated
      ? "generated-candidate-recipe"
      : "generated-curated-cue-sequence";
  const promotionAllowed = (knownGood && completedUsable) || (generated && completedGenerated);
  return {
    type: "foldgen.source_provenance.v1",
    case_id: pipelineCase.case_id,
    source_kind: sourceKind,
    source_status: knownGood
      ? "known-good-tutorial-fixture"
      : generated
        ? "generated-candidate-graduated-by-hard-gate"
        : "generated-cue-not-tutorial-source",
    recognizable: recognizableKnownGoodCaseIds.has(pipelineCase.case_id),
    license: knownGood || generated ? "CC0-1.0" : "repo-fixture-only",
    source_artifacts: {
      target_svg: `benchmarks/targets/${pipelineCase.target.file}`,
      derived_fold: pipelineCase.artifact_paths.derived_fold?.replace(`${pipelineOutDir}/`, `${pipelineOutDir}/`) ?? null,
      folded_state_fold: pipelineCase.artifact_paths.folded_state_fold?.replace(`${pipelineOutDir}/`, `${pipelineOutDir}/`) ?? null,
      display_decision: pipelineCase.artifact_paths.display_decision?.replace(`${pipelineOutDir}/`, `${pipelineOutDir}/`) ?? null,
      candidate_recipe: pipelineCase.artifact_paths.candidate_recipe ?? null,
      candidate_run: pipelineCase.artifact_paths.candidate_run ?? null
    },
    source_assertions: {
      structural_validation_passed: pipelineCase.validation_status === true,
      target_complete: targetComplete,
      completed_usable: completedUsable || completedGenerated,
      completed_usable_generated: completedGenerated,
      full_step_state_walkthrough: pipelineCase.step_state_status === "complete",
      generated_cue_sequence: !knownGood && !generated,
      generated_candidate: generated
    },
    promotion_allowed: promotionAllowed,
    promotion_policy: promotionAllowed
      ? generated
        ? "May appear as completed-usable-generated because it is reproducible, solver-backed, target-matched, full-step-state, and executor-feasibility-backed."
        : "May appear as completed-usable because it is repo-authored, solver-derived, target-matched, full-step-state, and overlay-backed."
      : "Must not appear as completed-usable tutorial source until provenance, target match, full step states, and overlays all pass.",
    limitations: knownGood
      ? recognizableKnownGoodCaseIds.has(pipelineCase.case_id)
        ? ["Simple recognizable solver-derived tutorial fixture; still not physical embodiment evidence."]
        : ["Simple solver-derived regression fixture; not yet a rich recognizable object."]
      : generated
        ? ["Generated candidate graduated through software gates; still not a known-good tutorial source or physical embodiment evidence."]
        : ["Generated curated cue sequence; not a known-good tutorial/state source."]
  };
}
