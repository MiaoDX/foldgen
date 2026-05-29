import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import assert from "node:assert/strict";

import { parseFold, validateExecutorReadableStep, validateFold } from "../../fold-core/src/index.mjs";
import { runCuratedPipeline, stage1ExecutorProfiles, validateVisualWalkthrough } from "../src/index.mjs";

const execFileAsync = promisify(execFile);

test("curated M2 pipeline writes default selected cases gated by solver-backed folded state", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "foldgen-m2-"));
  try {
    const summary = await runCuratedPipeline({ outDir });
    assert.equal(summary.ok, true);
    assert.equal(summary.case_count, 10);
    assert.equal(summary.completed_case_count >= 6, true);
    assert.equal(summary.completed_usable_case_count, 4);
    assert.equal(summary.completed_usable_generated_case_count, 1);
    assert.equal(summary.completed_3d_partial_walkthrough_case_count, 1);
    assert.equal(summary.blocked_case_count > 0, true);
    assert.ok(summary.cases.some((pipelineCase) => pipelineCase.status === "valid"));
    assert.ok(summary.cases.some((pipelineCase) => pipelineCase.status === "blocked"));

    for (const pipelineCase of summary.cases) {
      const isCompleted = pipelineCase.status === "valid";
      assert.equal(pipelineCase.validation_status, true);
      assert.equal(
        pipelineCase.display_mode,
        isCompleted
          ? pipelineCase.external_validation.step_states.status === "complete"
            ? pipelineCase.generated_candidate
              ? "completed-usable-generated"
              : "completed-usable"
            : "completed-3d-partial-walkthrough"
          : pipelineCase.external_validation.flat_folder_state.status !== "passed"
            ? "blocked-solver"
            : pipelineCase.external_validation.target_match.status !== "passed"
              ? "blocked-target-match"
              : "inspection-only"
      );
      assert.ok(pipelineCase.display_decision);
      assert.equal(pipelineCase.display_decision.display_mode, pipelineCase.display_mode);
      assert.equal(pipelineCase.result_quality.display_mode, pipelineCase.display_mode);
      assert.deepEqual(pipelineCase.claim_status, {
        claim_label: isCompleted
          ? "simulator-valid / executor-readable / embodiment-untested"
          : "simulator-invalid / executor-readable / embodiment-untested",
        simulator_valid: isCompleted,
        executor_readable: true,
        embodiment_validated: false,
        embodiment_status: "untested",
        final_record_path: null
      });
      assert.equal(pipelineCase.external_validation.community_fold.status, "passed");
      assert.match(pipelineCase.external_validation.flat_folder.status, /^(passed|failed)$/);
      assert.match(pipelineCase.external_validation.flat_folder_state.status, /^(passed|failed)$/);
      assert.equal(pipelineCase.external_validation.community_preview.status, "passed");
      assert.match(pipelineCase.external_validation.target_match.status, /^(passed|failed|blocked)$/);
      assert.equal(pipelineCase.result_quality.target_match_status, targetMatchStatusForCase(pipelineCase));
      assert.match(pipelineCase.result_quality.foldability_status, /^external-solver-(passed|failed)$/);
      assert.equal(
        pipelineCase.result_quality.preview_status,
        pipelineCase.external_validation.flat_folder_state.status === "passed" ? "solver-backed-folded-state" : "2.5d-inspection-only"
      );
      assert.equal(pipelineCase.result_quality.display_mode, pipelineCase.display_mode);
      assert.equal(pipelineCase.result_quality.physical_result_status, "not-proven");
      assert.equal(pipelineCase.executor_readable, true);
      assert.equal(pipelineCase.executor_profile, "human-hand");
      assert.deepEqual(pipelineCase.executor_profiles, stage1ExecutorProfiles);
      assert.ok(pipelineCase.selected_base_form.endsWith("-base.fold"));
      assert.ok(pipelineCase.artifact_paths.derived_fold);
      assert.ok(pipelineCase.artifact_paths.source_provenance);
      assert.ok(pipelineCase.artifact_paths.crease_svg);
      assert.ok(pipelineCase.artifact_paths.preview);
      assert.ok(pipelineCase.artifact_paths.preview_animation);
      assert.ok(pipelineCase.artifact_paths.step_states);
      assert.ok(pipelineCase.artifact_paths.executor_overlays);
      assert.ok(pipelineCase.artifact_paths.community_fold_validation);
      assert.ok(pipelineCase.artifact_paths.flat_folder_validation);
      assert.ok(pipelineCase.artifact_paths.flat_folder_state);
      assert.ok(pipelineCase.artifact_paths.folded_state_fold);
      assert.ok(pipelineCase.artifact_paths.target_match);
      assert.ok(pipelineCase.artifact_paths.display_decision);
      assert.ok(pipelineCase.artifact_paths.origami_simulator_fold);
      assert.ok(pipelineCase.artifact_paths.origami_simulator_preview);
      assert.ok(pipelineCase.artifact_paths.step_visuals);
      assert.ok(pipelineCase.artifact_paths.fold_program_ir);
      assert.ok(pipelineCase.artifact_paths.visual_walkthrough);
      assert.ok(pipelineCase.artifact_paths.diagram_sequence);
      assert.equal(pipelineCase.fold_program_ir_status, "thin-ir");
      assert.match(pipelineCase.visual_walkthrough_status, /^walkthrough-/);
      assert.ok(pipelineCase.artifact_paths.proposal_history);
      assert.ok(pipelineCase.artifact_paths.critic_history);
      assert.equal(pipelineCase.rejected_candidate_count >= 0, true);
      assert.equal(pipelineCase.selected_operation_count >= 1, true);
      if ((pipelineCase.case_id.startsWith("known-good-") || pipelineCase.case_id === "generated-triangle") && pipelineCase.case_id !== "known-good-square-packet") {
        assert.equal(pipelineCase.selected_operation_count, 1);
      }
      assert.equal(pipelineCase.step_state_status, pipelineCase.external_validation.step_states.status);
      assert.equal(pipelineCase.solver_backed_step_count, pipelineCase.external_validation.step_states.solver_backed_step_count);

      const caseDir = join(outDir, pipelineCase.case_id);
      const derived = parseFold(await readFile(join(caseDir, "derived.fold"), "utf8"));
      assert.equal(validateFold(derived).ok, true);
      assert.equal(derived.foldgen_history.length, pipelineCase.selected_operation_count);
      assert.match(await readFile(join(caseDir, "crease.svg"), "utf8"), /<svg/);

      const proposalHistory = JSON.parse(await readFile(join(caseDir, "proposal-history.json"), "utf8"));
      assert.ok(proposalHistory.candidates.some((candidate) => candidate.selected));
      assert.equal(
        proposalHistory.candidates.some((candidate) => candidate.validation_status === "invalid"),
        pipelineCase.case_id.startsWith("known-good-") || pipelineCase.case_id === "generated-triangle" ? false : true
      );
      assert.equal(
        proposalHistory.candidates.some((candidate) => candidate.operations.length > 1),
        pipelineCase.case_id === "known-good-square-packet"
          ? true
          : pipelineCase.case_id.startsWith("known-good-") || pipelineCase.case_id === "generated-triangle" ? false : true
      );

      const criticHistory = JSON.parse(await readFile(join(caseDir, "critic-history.json"), "utf8"));
      assert.equal(
        criticHistory.entries.some((entry) => entry.verdict === "rejected-invalid"),
        pipelineCase.case_id.startsWith("known-good-") || pipelineCase.case_id === "generated-triangle" ? false : true
      );

      const preview = JSON.parse(await readFile(join(caseDir, "preview.json"), "utf8"));
      assert.equal(preview.type, "foldgen.preview.v1");
      assert.ok(preview.vertices.length > 0);
      const animation = JSON.parse(await readFile(join(caseDir, "preview-animation.json"), "utf8"));
      assert.equal(animation.type, "foldgen.preview_animation.v1");
      assert.equal(animation.operation_count, pipelineCase.selected_operation_count);
      assert.equal(animation.frame_count, pipelineCase.selected_operation_count + 1);

      const sequence = JSON.parse(await readFile(join(caseDir, "diagram-sequence.json"), "utf8"));
      assert.equal(sequence.type, "foldgen.diagram_sequence.v1");
      assert.equal(sequence.executor_profile, "human-hand");
      assert.equal(sequence.step_count, pipelineCase.selected_operation_count);
      assert.equal(sequence.steps.length, pipelineCase.selected_operation_count);
      assert.equal(sequence.steps.every((step) => validateExecutorReadableStep(step).ok), true);
      for (const executorProfile of stage1ExecutorProfiles) {
        const profileSequence = JSON.parse(await readFile(join(caseDir, `diagram-sequence-${executorProfile}.json`), "utf8"));
        assert.equal(profileSequence.executor_profile, executorProfile);
        assert.equal(profileSequence.step_count, pipelineCase.selected_operation_count);
        assert.equal(profileSequence.executor_visual_metadata.instruction_label, "profile visual instructions");
        assert.ok(profileSequence.executor_visual_metadata.contact_zones.length > 0);
        assert.match(profileSequence.executor_visual_metadata.visual_asset_path, /^demo\/assets\/executors\/.+\.png$/);
        assert.equal(profileSequence.steps.length, pipelineCase.selected_operation_count);
        assert.equal(profileSequence.steps.every((step) => step.executor_profile === executorProfile), true);
        assert.equal(profileSequence.steps.every((step) => validateExecutorReadableStep(step).ok), true);
        assert.equal(pipelineCase.artifact_paths.diagram_sequences[executorProfile].endsWith(`diagram-sequence-${executorProfile}.json`), true);
      }

      const caseSummary = JSON.parse(await readFile(join(caseDir, "summary.json"), "utf8"));
      assert.equal(caseSummary.selected_candidate_id, pipelineCase.selected_candidate_id);
      const sourceProvenance = JSON.parse(await readFile(join(caseDir, "source-provenance.json"), "utf8"));
      assert.equal(sourceProvenance.type, "foldgen.source_provenance.v1");
      assert.equal(sourceProvenance.promotion_allowed, (pipelineCase.display_mode === "completed-usable" && pipelineCase.case_id.startsWith("known-good-"))
        || (pipelineCase.display_mode === "completed-usable-generated" && pipelineCase.generated_candidate === true));
      if (pipelineCase.case_id === "known-good-paper-hat") {
        assert.equal(sourceProvenance.recognizable, true);
      }
      if (pipelineCase.case_id === "generated-triangle") {
        assert.equal(sourceProvenance.source_kind, "generated-candidate-recipe");
        assert.equal(sourceProvenance.source_assertions.completed_usable_generated, true);
      }
      const displayDecision = JSON.parse(await readFile(join(caseDir, "display-decision.json"), "utf8"));
      assert.equal(displayDecision.type, "foldgen.display_decision.v1");
      assert.equal(displayDecision.display_mode, pipelineCase.display_mode);
      assert.equal(displayDecision.safe_to_render_3d_preview, isCompleted);
      assert.equal(displayDecision.safe_to_render_completed_card, pipelineCase.display_mode === "completed-usable" || pipelineCase.display_mode === "completed-usable-generated");
      const communityFoldValidation = JSON.parse(await readFile(join(caseDir, "community-fold-validation.json"), "utf8"));
      assert.equal(communityFoldValidation.status, "passed");
      const flatFolderValidation = JSON.parse(await readFile(join(caseDir, "flat-folder-validation.json"), "utf8"));
      assert.match(flatFolderValidation.status, /^(passed|failed)$/);
      const flatFolderState = JSON.parse(await readFile(join(caseDir, "flat-folder-state.json"), "utf8"));
      assert.equal(flatFolderState.status, pipelineCase.external_validation.flat_folder_state.status);
      if (isCompleted) {
        assert.equal(flatFolderState.status, "passed");
        const foldedState = parseFold(await readFile(join(caseDir, "folded-state.fold"), "utf8"));
        assert.equal(validateFold(foldedState).ok, true);
        assert.equal(foldedState.file_classes.includes("foldedForm"), true);
        assert.equal(foldedState.faceOrders.length, pipelineCase.external_validation.flat_folder_state.face_order_count);
      } else {
        assert.ok(["failed", "passed"].includes(flatFolderState.status));
      }
      const targetMatch = JSON.parse(await readFile(join(caseDir, "target-match.json"), "utf8"));
      assert.equal(targetMatch.status, pipelineCase.external_validation.target_match.status);
      if (isCompleted) {
        assert.equal(targetMatch.status, "passed");
        assert.equal(targetMatch.score >= targetMatch.threshold, true);
      }
      const simulatorPreview = JSON.parse(await readFile(join(caseDir, "origami-simulator-preview.json"), "utf8"));
      assert.equal(simulatorPreview.status, "passed");
      assert.match(await readFile(join(caseDir, "origami-simulator.fold"), "utf8"), /edges_foldAngle/);
      const stepStates = JSON.parse(await readFile(join(caseDir, "step-states.json"), "utf8"));
      assert.equal(stepStates.type, "foldgen.step_states.v1");
      assert.equal(stepStates.step_count, pipelineCase.selected_operation_count);
      assert.equal(stepStates.solver_backed_step_count, pipelineCase.solver_backed_step_count);
      if (pipelineCase.case_id.startsWith("known-good-") || pipelineCase.case_id === "generated-triangle") {
        assert.equal(stepStates.status, "complete");
        assert.equal(stepStates.solver_backed_step_count, pipelineCase.selected_operation_count);
        assert.ok(stepStates.states.every((state) => state.status === "solver-backed-post-state"));
        assert.ok(stepStates.states.every((state) => state.frame_difference.status === "changed"));
        assert.equal(displayDecision.display_mode, pipelineCase.case_id === "generated-triangle" ? "completed-usable-generated" : "completed-usable");
      }
      if (pipelineCase.case_id === "simple-fish") {
        assert.equal(displayDecision.display_mode, "completed-3d-partial-walkthrough");
        assert.equal(displayDecision.weakest_failed_gate, "step-state-walkthrough");
      }
      if (isCompleted) {
        assert.equal(stepStates.solver_backed_step_count >= 1, true);
      }
      const foldProgramIr = JSON.parse(await readFile(join(caseDir, "fold-program-ir.json"), "utf8"));
      assert.equal(foldProgramIr.type, "foldgen.fold_program_ir.v1");
      assert.equal(foldProgramIr.operations.length, pipelineCase.selected_operation_count);
      assert.equal(foldProgramIr.dsl_policy.textual_dsl_status, "deferred");
      const stepVisuals = JSON.parse(await readFile(join(caseDir, "step-visuals.json"), "utf8"));
      assert.equal(stepVisuals.type, "foldgen.step_visuals.v1");
      assert.match(stepVisuals.display_source, /step-state|inspection-preview/);
      assert.equal(stepVisuals.step_state_artifact_path, pipelineCase.artifact_paths.step_states);
      assert.equal(stepVisuals.solver_backed_step_count, stepStates.solver_backed_step_count);
      assert.equal(stepVisuals.step_count, pipelineCase.selected_operation_count);
      assert.ok(stepVisuals.annotation_legend.some((entry) => entry.key === "active-fold-line"));
      assert.ok(stepVisuals.annotation_legend.some((entry) => entry.key === "executor-contact-overlay"));
      assert.deepEqual(Object.keys(stepVisuals.profile_steps).sort(), [...stage1ExecutorProfiles].sort());
      assert.equal(stepVisuals.steps.every((step) => (
        step.svg.includes("<svg")
          && step.preview_3d?.type === "foldgen.preview.v1"
          && step.preview_3d.faces.length > 0
          && step.annotations.some((annotation) => annotation.type === "active-fold-line")
          && step.annotation_legend.some((entry) => entry.key === "active-fold-line")
          && step.executor_overlay?.geometry_binding?.operation_id === step.operation_id
          && step.frame_difference
      )), true);
      if (pipelineCase.case_id === "generated-triangle") {
        assert.equal(pipelineCase.generated_candidate, true);
        assert.equal(pipelineCase.generation_status, "graduated");
        assert.ok(pipelineCase.artifact_paths.candidate_recipe);
        assert.ok(pipelineCase.artifact_paths.candidate_run);
        const candidateRecipe = JSON.parse(await readFile(join(caseDir, "candidate-recipe.json"), "utf8"));
        assert.equal(candidateRecipe.type, "foldgen.generated_candidate_recipe.v1");
        assert.equal(candidateRecipe.selected_candidate_id, pipelineCase.selected_candidate_id);
        assert.ok(candidateRecipe.generator.seed);
        const candidateRun = JSON.parse(await readFile(join(caseDir, "candidate-run.json"), "utf8"));
        assert.equal(candidateRun.type, "foldgen.generated_candidate_run.v1");
        assert.equal(candidateRun.status, "graduated");
        assert.equal(candidateRun.display_mode, "completed-usable-generated");
      }
      if (pipelineCase.case_id.startsWith("known-good-") || pipelineCase.case_id === "generated-triangle") {
        assert.equal(stepVisuals.display_source_status, "solver-backed-post-states");
        assert.ok(stepVisuals.steps.every((step) => step.display_source === "flat-folder-step-state"));
        assert.ok(stepVisuals.steps.every((step) => step.frame_difference.status === "changed"));
      }
      assert.equal(stepVisuals.steps.every((step) => !/stroke-dasharray/.test(step.svg)), true);
      const executorOverlays = JSON.parse(await readFile(join(caseDir, "executor-overlays", "executor-overlays.json"), "utf8"));
      assert.equal(executorOverlays.type, "foldgen.executor_overlays.v1");
      assert.equal(executorOverlays.status, "complete");
      assert.equal(executorOverlays.profile_count, stage1ExecutorProfiles.length);
      assert.equal(pipelineCase.external_validation.executor_overlays.status, "complete");
      for (const executorProfile of stage1ExecutorProfiles) {
        assert.equal(executorOverlays.artifact_paths[executorProfile].length, pipelineCase.selected_operation_count);
        const firstOverlayArtifact = JSON.parse(await readFile(executorOverlays.artifact_paths[executorProfile][0], "utf8"));
        assert.equal(firstOverlayArtifact.type, "foldgen.executor_overlay_artifact.v1");
        assert.equal(firstOverlayArtifact.geometry_bound, true);
        assert.equal(stepVisuals.profile_steps[executorProfile][0].executor_overlay_artifact_path, executorOverlays.artifact_paths[executorProfile][0]);
      }
      const humanOverlay = stepVisuals.profile_steps["human-hand"][0].executor_overlay;
      const catOverlay = stepVisuals.profile_steps["cat-paw-profile"][0].executor_overlay;
      const dogOverlay = stepVisuals.profile_steps["dog-paw-profile"][0].executor_overlay;
      const gripperOverlay = stepVisuals.profile_steps["two-finger-gripper"][0].executor_overlay;
      assert.notDeepEqual(humanOverlay.zones, catOverlay.zones);
      assert.notDeepEqual(gripperOverlay.zones, dogOverlay.zones);
      assert.equal(catOverlay.status, "precision-actions-blocked-or-fixture-needed");
      assert.equal(dogOverlay.status, "precision-actions-blocked-or-fixture-needed");
      assert.ok(catOverlay.zones.some((zone) => zone.primitive === "blocked-precision"));
      assert.ok(dogOverlay.zones.some((zone) => zone.primitive === "blocked-precision"));
      const walkthrough = JSON.parse(await readFile(join(caseDir, "visual-walkthrough.json"), "utf8"));
      if (pipelineCase.case_id === "simple-bird") {
        assert.equal(validateVisualWalkthrough(walkthrough).ok, true);
      } else {
        assert.equal(walkthrough.status, "walkthrough-generated");
      }
      assert.equal(walkthrough.frame_count, pipelineCase.selected_operation_count + 1);
    }

    const writtenSummary = JSON.parse(await readFile(join(outDir, "summary.json"), "utf8"));
    assert.equal(writtenSummary.ok, true);
    assert.equal(writtenSummary.case_count, 10);
    assert.equal(writtenSummary.completed_case_count >= 6, true);
    assert.equal(writtenSummary.completed_usable_case_count, 4);
    assert.equal(writtenSummary.completed_usable_generated_case_count, 1);
    assert.equal(writtenSummary.completed_3d_partial_walkthrough_case_count, 1);
    assert.equal(writtenSummary.completed_case_count, summary.completed_case_count);
    assert.equal(writtenSummary.blocked_case_count, summary.blocked_case_count);
    assert.equal(writtenSummary.claim_status.claim_label, "simulator-invalid / executor-readable / embodiment-untested");
    assert.equal(writtenSummary.claim_status.simulator_valid, false);
    assert.equal(writtenSummary.claim_status.executor_readable, true);
    assert.ok(writtenSummary.cases.every((pipelineCase) => pipelineCase.external_validation.community_fold.status === "passed"));
    assert.ok(writtenSummary.cases.every((pipelineCase) => /^(passed|failed)$/.test(pipelineCase.external_validation.flat_folder.status)));
    assert.ok(writtenSummary.cases.every((pipelineCase) => /^(passed|failed)$/.test(pipelineCase.external_validation.flat_folder_state.status)));
    assert.ok(writtenSummary.cases.every((pipelineCase) => /^(passed|failed|blocked)$/.test(pipelineCase.external_validation.target_match.status)));
    assert.ok(writtenSummary.cases.every((pipelineCase) => pipelineCase.external_validation.community_preview.status === "passed"));
    assert.ok(writtenSummary.cases.every((pipelineCase) => pipelineCase.status !== "valid" || (
      pipelineCase.external_validation.flat_folder_state.status === "passed"
        && pipelineCase.external_validation.target_match.status === "passed"
        && ["completed-usable", "completed-usable-generated", "completed-3d-partial-walkthrough"].includes(pipelineCase.display_mode)
    )));
    assert.ok(writtenSummary.cases.every((pipelineCase) => pipelineCase.status === "valid" || !["completed-usable", "completed-usable-generated", "completed-3d-partial-walkthrough"].includes(pipelineCase.display_mode)));
    assert.ok(new Set(writtenSummary.cases.map((pipelineCase) => pipelineCase.selected_operation_count)).size > 1);
    assert.ok(writtenSummary.cases.every((pipelineCase) => (
      stage1ExecutorProfiles.every((executorProfile) => pipelineCase.executor_profiles.includes(executorProfile))
    )));
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

function targetMatchStatusForCase(pipelineCase) {
  if (pipelineCase.external_validation.target_match.status === "passed") {
    return "target-match-passed";
  }
  if (pipelineCase.external_validation.target_match.status === "failed") {
    return "target-match-failed";
  }
  return "target-match-blocked-by-solver";
}

test("M2 pipeline CLI writes a five-case summary", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "foldgen-m2-cli-"));
  try {
    const { stdout } = await execFileAsync("node", ["packages/foldgen-agent/bin/run-pipeline.mjs", outDir]);
    const summary = JSON.parse(stdout);
    assert.equal(summary.ok, true);
    assert.equal(summary.case_count, 10);
    assert.equal(summary.cases.length, 10);
    assert.equal(summary.cases.filter((pipelineCase) => pipelineCase.status === "valid").length >= 6, true);
    assert.ok(summary.cases.some((pipelineCase) => pipelineCase.status === "valid"));
    assert.ok(summary.cases.some((pipelineCase) => pipelineCase.status === "blocked"));
    assert.ok(summary.cases.every((pipelineCase) => pipelineCase.selected_operation_count >= 1));
    assert.ok(summary.cases.every((pipelineCase) => /simulator-(valid|invalid) \/ executor-readable \/ embodiment-untested/.test(pipelineCase.claim_status.claim_label)));
    assert.ok(summary.cases.every((pipelineCase) => pipelineCase.status === "valid" ? ["completed-usable", "completed-usable-generated", "completed-3d-partial-walkthrough"].includes(pipelineCase.display_mode) : !["completed-usable", "completed-usable-generated", "completed-3d-partial-walkthrough"].includes(pipelineCase.display_mode)));
    assert.ok(summary.cases.every((pipelineCase) => pipelineCase.executor_readable === true));
    assert.ok(summary.cases.every((pipelineCase) => stage1ExecutorProfiles.every((executorProfile) => pipelineCase.executor_profiles.includes(executorProfile))));
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});
