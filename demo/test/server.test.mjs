import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { runCuratedPipeline } from "../../packages/foldgen-agent/src/index.mjs";
import { createDemoServer } from "../server.mjs";

test("demo server serves app shell and local pipeline artifacts", async () => {
  await runCuratedPipeline({ outDir: "out/m2-pipeline" });
  const server = createDemoServer({ root: process.cwd() });
  await listen(server);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const html = await fetchText(`${baseUrl}/demo/`);
    assert.match(html, /id="app-shell"/);
    assert.match(html, /id="target-select"/);
    assert.match(html, /id="profile-select"/);
    assert.match(html, /id="image-upload"/);
    assert.match(html, /id="preview-canvas"/);
    assert.match(html, /id="folded-preview-stage"/);
    assert.match(html, /id="step-diagram"/);
    assert.match(html, /id="step-folded-preview-stage"/);
    assert.match(html, /id="step-preview-canvas"/);
    assert.match(html, /id="case-evidence"/);
    assert.match(html, /id="executor-image"/);
    assert.match(html, /id="downloads"/);
    assert.match(html, /id="embodiment-status"/);
    assert.match(html, /id="validation-status"/);
    assert.match(html, /id="instruction-label"/);

    const script = await fetchText(`${baseUrl}/demo/app.js`);
    assert.match(script, /fetchCaseArtifacts/);
    assert.match(script, /three\/build\/three\.module\.js/);
    assert.match(script, /renderFoldedStatePreview/);
    assert.match(script, /renderStepStatePreview/);
    assert.match(script, /solver-backed-step-state/);
    assert.match(script, /overlayProfile/);
    assert.match(script, /addExecutorOverlay3d/);
    assert.match(script, /display_mode/);
    assert.match(script, /displayDecision/);
    assert.match(script, /canRenderBackend3d/);
    assert.match(script, /displayStateForCase/);
    assert.match(script, /formatDisplayMode/);
    assert.match(script, /renderStepVisualSemantics/);
    assert.match(script, /pageParams/);
    assert.match(script, /formatClaimStatus/);
    assert.match(script, /claim_status/);
    assert.match(script, /executor_profile/);
    assert.match(script, /renderActionFlow/);
    assert.match(script, /previewAnimation/);
    assert.match(script, /renderValidationStatus/);
    assert.match(script, /renderWalkthrough/);
    assert.match(script, /renderEvidenceNotice/);
    assert.match(script, /renderExecutorImage/);
    assert.match(script, /flatFolderState/);
    assert.match(script, /targetMatch/);
    assert.match(script, /foldedStateFold/);
    assert.match(script, /drawPreviewFaces/);
    assert.match(script, /community_fold_validation/);
    assert.match(script, /flat_folder_validation/);
    assert.match(script, /drawPreviewFrame/);

    const summary = await fetchJson(`${baseUrl}/out/m2-pipeline/summary.json`);
    assert.equal(summary.ok, true);
    assert.equal(summary.case_count, 10);
    assert.equal(summary.completed_case_count >= 6, true);
    assert.equal(summary.completed_usable_case_count, 4);
    assert.equal(summary.completed_usable_generated_case_count, 1);
    assert.equal(summary.completed_3d_partial_walkthrough_case_count, 1);
    assert.equal(summary.blocked_case_count > 0, true);
    assert.equal(summary.claim_status.claim_label, "simulator-invalid / executor-readable / embodiment-untested");
    assert.equal(summary.claim_status.simulator_valid, false);
    assert.equal(summary.claim_status.executor_readable, true);

    const firstCase = summary.cases.find((pipelineCase) => pipelineCase.case_id === "simple-boat");
    assert.ok(firstCase);
    assert.equal(firstCase.status, "blocked");
    assert.equal(firstCase.display_mode, "blocked-solver");
    assert.equal(firstCase.executor_readable, true);
    assert.deepEqual(firstCase.executor_profiles, ["human-hand", "two-finger-gripper", "cat-paw-profile", "dog-paw-profile"]);
    assert.equal(firstCase.selected_operation_count > 1, true);
    assert.equal(firstCase.external_validation.community_fold.status, "passed");
    assert.equal(firstCase.external_validation.flat_folder.status, "failed");
    assert.equal(firstCase.external_validation.flat_folder_state.status, "failed");
    assert.equal(firstCase.external_validation.target_match.status, "blocked");
    assert.equal(firstCase.result_quality.target_match_status, "target-match-blocked-by-solver");
    assert.equal(firstCase.result_quality.physical_result_status, "not-proven");
    assert.equal(firstCase.result_quality.preview_status, "2.5d-inspection-only");
    assert.equal(firstCase.result_quality.display_mode, "blocked-solver");
    assert.ok(firstCase.artifact_paths.display_decision);
    assert.ok(firstCase.artifact_paths.source_provenance);
    assert.ok(firstCase.artifact_paths.step_visuals);
    assert.ok(firstCase.artifact_paths.step_states);
    assert.ok(firstCase.artifact_paths.executor_overlays);
    const sequence = await fetchJson(`${baseUrl}/${firstCase.artifact_paths.diagram_sequence}`);
    assert.equal(sequence.step_count, firstCase.selected_operation_count);
    assert.equal(sequence.steps.length, firstCase.selected_operation_count);
    assert.equal(sequence.steps[0].executor_profile, "human-hand");
    assert.ok(sequence.steps[0].actions.some((action) => action.phase === "align"));
    const dogSequence = await fetchJson(`${baseUrl}/${firstCase.artifact_paths.diagram_sequences["dog-paw-profile"]}`);
    assert.equal(dogSequence.steps[0].executor_profile, "dog-paw-profile");
    assert.equal(dogSequence.step_count, firstCase.selected_operation_count);
    assert.ok(dogSequence.executor_visual_metadata.contact_zones.length > 0);
    assert.equal(dogSequence.executor_visual_metadata.instruction_label, "profile visual instructions");
    assert.match(dogSequence.executor_visual_metadata.visual_asset_path, /demo\/assets\/executors\/dog-paw-profile\.png/);

    const communityFold = await fetchJson(`${baseUrl}/${firstCase.artifact_paths.community_fold_validation}`);
    assert.equal(communityFold.status, "passed");
    const flatFolder = await fetchJson(`${baseUrl}/${firstCase.artifact_paths.flat_folder_validation}`);
    assert.equal(flatFolder.status, "failed");
    const flatFolderState = await fetchJson(`${baseUrl}/${firstCase.artifact_paths.flat_folder_state}`);
    assert.equal(flatFolderState.status, "failed");
    assert.match(flatFolderState.errors.join("\n"), /Unable to resolve/);
    const targetMatch = await fetchJson(`${baseUrl}/${firstCase.artifact_paths.target_match}`);
    assert.equal(targetMatch.status, "blocked");
    assert.equal(targetMatch.blocker, "missing-solver-backed-folded-state");
    const boatDisplayDecision = await fetchJson(`${baseUrl}/${firstCase.artifact_paths.display_decision}`);
    assert.equal(boatDisplayDecision.display_mode, "blocked-solver");
    assert.equal(boatDisplayDecision.safe_to_render_completed_card, false);
    assert.equal(boatDisplayDecision.safe_to_render_3d_preview, false);
    const simulatorPreview = await fetchJson(`${baseUrl}/${firstCase.artifact_paths.origami_simulator_preview}`);
    assert.equal(simulatorPreview.status, "passed");
    assert.match(simulatorPreview.import_url, /origamisimulator/);
    const foldProgramIr = await fetchJson(`${baseUrl}/${firstCase.artifact_paths.fold_program_ir}`);
    assert.equal(foldProgramIr.type, "foldgen.fold_program_ir.v1");
    const stepVisuals = await fetchJson(`${baseUrl}/${firstCase.artifact_paths.step_visuals}`);
    assert.equal(stepVisuals.step_count, firstCase.selected_operation_count);
    assert.equal(stepVisuals.display_source_status, "inspection-only-until-step-state-backend");
    assert.equal(stepVisuals.step_state_artifact_path, firstCase.artifact_paths.step_states);
    assert.ok(stepVisuals.annotation_legend.some((entry) => entry.key === "active-fold-line"));
    assert.ok(stepVisuals.annotation_legend.some((entry) => entry.key === "executor-contact-overlay"));
    assert.deepEqual(Object.keys(stepVisuals.profile_steps).sort(), ["cat-paw-profile", "dog-paw-profile", "human-hand", "two-finger-gripper"]);
    assert.match(stepVisuals.steps[0].svg, /<svg/);
    assert.doesNotMatch(stepVisuals.steps[0].svg, /stroke-dasharray/);
    assert.equal(stepVisuals.steps[0].executor_overlay.geometry_binding.operation_id, stepVisuals.steps[0].operation_id);
    assert.equal(stepVisuals.profile_steps["cat-paw-profile"][0].executor_overlay.status, "precision-actions-blocked-or-fixture-needed");
    assert.ok(stepVisuals.profile_steps["cat-paw-profile"][0].executor_overlay.zones.some((zone) => zone.primitive === "blocked-precision"));
    const executorOverlays = await fetchJson(`${baseUrl}/${firstCase.artifact_paths.executor_overlays}`);
    assert.equal(executorOverlays.status, "complete");
    assert.equal(executorOverlays.artifact_paths["cat-paw-profile"].length, firstCase.selected_operation_count);
    assert.equal(stepVisuals.profile_steps["cat-paw-profile"][0].executor_overlay_artifact_path, executorOverlays.artifact_paths["cat-paw-profile"][0]);
    const catOverlayArtifact = await fetchJson(`${baseUrl}/${executorOverlays.artifact_paths["cat-paw-profile"][0]}`);
    assert.equal(catOverlayArtifact.geometry_bound, true);
    assert.ok(catOverlayArtifact.zones.some((zone) => zone.primitive === "blocked-precision"));
    assert.equal(stepVisuals.steps[0].preview_3d.type, "foldgen.preview.v1");
    assert.ok(stepVisuals.steps[0].preview_3d.faces.length > 0);
    const knownGood = summary.cases.find((pipelineCase) => pipelineCase.case_id === "known-good-triangle");
    assert.ok(knownGood);
    assert.equal(knownGood.display_mode, "completed-usable");
    const knownGoodDisplayDecision = await fetchJson(`${baseUrl}/${knownGood.artifact_paths.display_decision}`);
    assert.equal(knownGoodDisplayDecision.display_mode, "completed-usable");
    assert.equal(knownGoodDisplayDecision.safe_to_render_completed_card, true);
    const knownGoodStepVisuals = await fetchJson(`${baseUrl}/${knownGood.artifact_paths.step_visuals}`);
    assert.equal(knownGoodStepVisuals.display_source_status, "solver-backed-post-states");
    assert.equal(knownGoodStepVisuals.steps[0].display_source, "flat-folder-step-state");
    assert.equal(knownGoodStepVisuals.steps[0].frame_difference.status, "changed");
    const knownGoodStepStates = await fetchJson(`${baseUrl}/${knownGood.artifact_paths.step_states}`);
    assert.equal(knownGoodStepStates.status, "complete");
    assert.equal(knownGoodStepStates.solver_backed_step_count, knownGood.selected_operation_count);
    const paperHat = summary.cases.find((pipelineCase) => pipelineCase.case_id === "known-good-paper-hat");
    assert.ok(paperHat);
    assert.equal(paperHat.display_mode, "completed-usable");
    const paperHatProvenance = await fetchJson(`${baseUrl}/${paperHat.artifact_paths.source_provenance}`);
    assert.equal(paperHatProvenance.promotion_allowed, true);
    assert.equal(paperHatProvenance.recognizable, true);
    const squarePacket = summary.cases.find((pipelineCase) => pipelineCase.case_id === "known-good-square-packet");
    assert.ok(squarePacket);
    assert.equal(squarePacket.display_mode, "completed-usable");
    assert.equal(squarePacket.selected_operation_count, 2);
    const squarePacketStepStates = await fetchJson(`${baseUrl}/${squarePacket.artifact_paths.step_states}`);
    assert.equal(squarePacketStepStates.status, "complete");
    assert.equal(squarePacketStepStates.solver_backed_step_count, 2);
    const generatedTriangle = summary.cases.find((pipelineCase) => pipelineCase.case_id === "generated-triangle");
    assert.ok(generatedTriangle);
    assert.equal(generatedTriangle.generated_candidate, true);
    assert.equal(generatedTriangle.generation_status, "graduated");
    assert.equal(generatedTriangle.display_mode, "completed-usable-generated");
    assert.ok(generatedTriangle.artifact_paths.candidate_recipe);
    assert.ok(generatedTriangle.artifact_paths.candidate_run);
    const generatedDisplayDecision = await fetchJson(`${baseUrl}/${generatedTriangle.artifact_paths.display_decision}`);
    assert.equal(generatedDisplayDecision.display_mode, "completed-usable-generated");
    assert.equal(generatedDisplayDecision.generated_usable, true);
    const generatedRecipe = await fetchJson(`${baseUrl}/${generatedTriangle.artifact_paths.candidate_recipe}`);
    assert.equal(generatedRecipe.type, "foldgen.generated_candidate_recipe.v1");
    assert.equal(generatedRecipe.selected_candidate_id, generatedTriangle.selected_candidate_id);
    const generatedRun = await fetchJson(`${baseUrl}/${generatedTriangle.artifact_paths.candidate_run}`);
    assert.equal(generatedRun.type, "foldgen.generated_candidate_run.v1");
    assert.equal(generatedRun.status, "graduated");
    const generatedProvenance = await fetchJson(`${baseUrl}/${generatedTriangle.artifact_paths.source_provenance}`);
    assert.equal(generatedProvenance.source_kind, "generated-candidate-recipe");
    assert.equal(generatedProvenance.source_assertions.completed_usable_generated, true);
    const fish = summary.cases.find((pipelineCase) => pipelineCase.case_id === "simple-fish");
    assert.ok(fish);
    assert.equal(fish.display_mode, "completed-3d-partial-walkthrough");
    const fishDisplayDecision = await fetchJson(`${baseUrl}/${fish.artifact_paths.display_decision}`);
    assert.equal(fishDisplayDecision.safe_to_render_3d_preview, true);
    assert.equal(fishDisplayDecision.safe_to_render_completed_card, false);
    const executorImage = await fetch(`${baseUrl}/${dogSequence.executor_visual_metadata.visual_asset_path}`);
    assert.equal(executorImage.status, 200);
    assert.equal(executorImage.headers.get("content-type"), "image/png");
    const walkthrough = await fetchJson(`${baseUrl}/${firstCase.artifact_paths.visual_walkthrough}`);
    assert.match(walkthrough.status, /^walkthrough-/);
    assert.equal(walkthrough.frame_count, firstCase.selected_operation_count + 1);

    const preview = await fetchJson(`${baseUrl}/${firstCase.artifact_paths.preview}`);
    assert.equal(preview.type, "foldgen.preview.v1");
    const animation = await fetchJson(`${baseUrl}/${firstCase.artifact_paths.preview_animation}`);
    assert.equal(animation.type, "foldgen.preview_animation.v1");
    assert.equal(animation.frame_count, firstCase.selected_operation_count + 1);
    const threeModule = await fetchText(`${baseUrl}/node_modules/three/build/three.module.js`);
    assert.match(threeModule, /class WebGLRenderer/);

    const missing = await fetch(`${baseUrl}/demo/missing.js`);
    assert.equal(missing.status, 404);
  } finally {
    await close(server);
  }
});

test("demo app module keeps project-page summary request path", async () => {
  const script = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(script, /import \* as THREE/);
  assert.match(script, /loadSummary\(\)/);
  assert.match(script, /assetUrl\("out\/m2-pipeline\/summary\.json"\)/);
  assert.match(script, /new URL\("\.\.\/", currentDir\)/);
});

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

async function fetchText(url) {
  const response = await fetch(url);
  assert.equal(response.status, 200);
  return response.text();
}

async function fetchJson(url) {
  const response = await fetch(url);
  assert.equal(response.status, 200);
  return response.json();
}
