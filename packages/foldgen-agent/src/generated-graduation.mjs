import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

import { stableStringify } from "../../fold-core/src/index.mjs";
import { runCuratedPipeline } from "./pipeline.mjs";
import { runLocalPreviewReviewGate } from "./production-gates.mjs";

const GENERATED_CASE_ID = "generated-triangle";
const BOAT_CASE_ID = "simple-boat";

export async function runGeneratedCandidateHarnessGate(options = {}) {
  const outDir = options.outDir ?? "out/m30-generated-candidate-harness";
  const pipelineOutDir = join(outDir, "pipeline");
  await mkdir(outDir, { recursive: true });
  const pipelineSummary = await runCuratedPipeline({ outDir: pipelineOutDir });
  const { generatedCase, caseDir, recipe, run, displayDecision, errors } = await loadGeneratedArtifacts({ pipelineSummary, pipelineOutDir });

  if (generatedCase) {
    if (generatedCase.generated_candidate !== true) {
      errors.push("generated case summary must set generated_candidate=true");
    }
    if (generatedCase.generation_status !== "graduated") {
      errors.push(`generated case must graduate in harness gate, got ${generatedCase.generation_status}`);
    }
    if (!generatedCase.artifact_paths?.candidate_recipe) {
      errors.push("generated case missing candidate_recipe artifact path");
    }
    if (!generatedCase.artifact_paths?.candidate_run) {
      errors.push("generated case missing candidate_run artifact path");
    }
  }
  if (recipe) {
    if (recipe.type !== "foldgen.generated_candidate_recipe.v1") {
      errors.push("candidate recipe has wrong type");
    }
    if (!recipe.generator?.id || !recipe.generator?.seed || !recipe.generator?.operation_library_id) {
      errors.push("candidate recipe must record generator id, seed, and operation library");
    }
    if (recipe.selected_candidate_id !== generatedCase?.selected_candidate_id) {
      errors.push("candidate recipe selected id must match case summary");
    }
    if (!Array.isArray(recipe.selected_operations) || recipe.selected_operations.length < 1) {
      errors.push("candidate recipe must record selected operations");
    }
  }
  if (run) {
    if (run.type !== "foldgen.generated_candidate_run.v1") {
      errors.push("candidate run has wrong type");
    }
    if (run.status !== "graduated") {
      errors.push(`candidate run must be graduated for the positive fixture, got ${run.status}`);
    }
    if (run.display_mode !== "completed-usable-generated") {
      errors.push(`candidate run display_mode must be completed-usable-generated, got ${run.display_mode}`);
    }
    if (run.selected_candidate_id !== recipe?.selected_candidate_id) {
      errors.push("candidate run selected id must match recipe");
    }
  }
  if (displayDecision) {
    if (displayDecision.display_mode !== "completed-usable-generated") {
      errors.push(`display decision must use generated completion mode, got ${displayDecision.display_mode}`);
    }
    if (displayDecision.generated_usable !== true) {
      errors.push("display decision must set generated_usable=true");
    }
  }

  const result = {
    type: "foldgen.generated_candidate_harness_gate.v1",
    ok: errors.length === 0,
    status: errors.length === 0 ? "passed" : "failed",
    outDir,
    pipeline_out_dir: pipelineOutDir,
    generated_case_id: generatedCase?.case_id ?? null,
    case_dir: caseDir ? toRepoPath(caseDir) : null,
    selected_candidate_id: generatedCase?.selected_candidate_id ?? null,
    display_mode: displayDecision?.display_mode ?? null,
    candidate_recipe_path: generatedCase?.artifact_paths?.candidate_recipe ?? null,
    candidate_run_path: generatedCase?.artifact_paths?.candidate_run ?? null,
    errors
  };
  await writeJson(join(outDir, "m30-generated-candidate-harness.json"), result);
  return result;
}

export async function runBackendStateRouterGate(options = {}) {
  const outDir = options.outDir ?? "out/m31-backend-state-router";
  const pipelineOutDir = join(outDir, "pipeline");
  await mkdir(outDir, { recursive: true });
  const pipelineSummary = await runCuratedPipeline({ outDir: pipelineOutDir });
  const { generatedCase, run, displayDecision, errors } = await loadGeneratedArtifacts({ pipelineSummary, pipelineOutDir });
  const boat = pipelineSummary.cases.find((entry) => entry.case_id === BOAT_CASE_ID) ?? null;

  if (generatedCase?.external_validation?.flat_folder_state?.status !== "passed") {
    errors.push("generated candidate requires passed backend folded-state artifact");
  }
  if (!generatedCase?.artifact_paths?.folded_state_fold) {
    errors.push("generated candidate missing folded_state_fold artifact path");
  }
  if (run?.gate_summary?.backend_state !== "passed") {
    errors.push(`candidate run backend_state must be passed, got ${run?.gate_summary?.backend_state ?? "missing"}`);
  }
  if (displayDecision?.render_source !== "folded-state.fold") {
    errors.push("generated display must render from folded-state.fold");
  }
  if (boat?.display_mode !== "blocked-solver") {
    errors.push(`boat must remain blocked-solver, got ${boat?.display_mode ?? "missing"}`);
  }
  if (boat?.artifact_paths?.candidate_recipe) {
    errors.push("boat must not receive generated graduation recipe artifacts");
  }

  const result = {
    type: "foldgen.backend_state_router_gate.v1",
    ok: errors.length === 0,
    status: errors.length === 0 ? "passed" : "failed",
    outDir,
    generated_case_id: generatedCase?.case_id ?? null,
    backend_state_status: generatedCase?.external_validation?.flat_folder_state?.status ?? null,
    folded_state_fold: generatedCase?.artifact_paths?.folded_state_fold ?? null,
    render_source: displayDecision?.render_source ?? null,
    boat: boat ? {
      case_id: boat.case_id,
      display_mode: boat.display_mode,
      backend_state_status: boat.external_validation?.flat_folder_state?.status ?? null
    } : null,
    errors
  };
  await writeJson(join(outDir, "m31-backend-state-router.json"), result);
  return result;
}

export async function runGeneratedTargetScorerGate(options = {}) {
  const outDir = options.outDir ?? "out/m32-generated-target-scorer";
  const pipelineOutDir = join(outDir, "pipeline");
  await mkdir(outDir, { recursive: true });
  const pipelineSummary = await runCuratedPipeline({ outDir: pipelineOutDir });
  const { generatedCase, run, displayDecision, errors } = await loadGeneratedArtifacts({ pipelineSummary, pipelineOutDir });
  const wrongTargetFixture = buildGeneratedWrongTargetFixture({ generatedCase });

  if (generatedCase?.external_validation?.target_match?.status !== "passed") {
    errors.push("generated candidate requires passed target-match");
  }
  if ((generatedCase?.external_validation?.target_match?.score ?? 0) < (generatedCase?.external_validation?.target_match?.threshold ?? 1)) {
    errors.push("generated target-match score must meet threshold");
  }
  if (run?.gate_summary?.target_match !== "passed") {
    errors.push(`candidate run target_match must be passed, got ${run?.gate_summary?.target_match ?? "missing"}`);
  }
  if (displayDecision?.generated_usable !== true) {
    errors.push("generated target scorer requires generated_usable display decision");
  }
  if (wrongTargetFixture.status !== "rejected-target-match") {
    errors.push("wrong-target generated negative must be rejected-target-match");
  }

  const result = {
    type: "foldgen.generated_target_scorer_gate.v1",
    ok: errors.length === 0,
    status: errors.length === 0 ? "passed" : "failed",
    outDir,
    generated_case_id: generatedCase?.case_id ?? null,
    target_match: generatedCase?.external_validation?.target_match ?? null,
    wrong_target_fixture: wrongTargetFixture,
    errors
  };
  await writeJson(join(outDir, "m32-generated-target-scorer.json"), result);
  return result;
}

export async function runGeneratedStepReplayGate(options = {}) {
  const outDir = options.outDir ?? "out/m33-generated-step-replay";
  const pipelineOutDir = join(outDir, "pipeline");
  await mkdir(outDir, { recursive: true });
  const pipelineSummary = await runCuratedPipeline({ outDir: pipelineOutDir });
  const { generatedCase, caseDir, run, errors } = await loadGeneratedArtifacts({ pipelineSummary, pipelineOutDir });
  const stepStates = caseDir ? await readJson(join(caseDir, "step-states.json"), errors, "step-states") : null;
  const stepVisuals = caseDir ? await readJson(join(caseDir, "step-visuals.json"), errors, "step-visuals") : null;

  if (generatedCase?.step_state_status !== "complete") {
    errors.push(`generated case step_state_status must be complete, got ${generatedCase?.step_state_status ?? "missing"}`);
  }
  if (stepStates?.status !== "complete") {
    errors.push(`generated step-states artifact must be complete, got ${stepStates?.status ?? "missing"}`);
  }
  if (stepStates && stepStates.solver_backed_step_count !== stepStates.step_count) {
    errors.push("generated step-states must be solver-backed for every step");
  }
  for (const state of stepStates?.states ?? []) {
    if (!state.pre_state_fold_path || !state.folded_state_path) {
      errors.push(`generated step ${state.step}: missing pre/post state artifacts`);
    }
    if (state.frame_difference?.status !== "changed") {
      errors.push(`generated step ${state.step}: expected changed frame difference`);
    }
  }
  for (const step of stepVisuals?.steps ?? []) {
    if (step.display_source !== "flat-folder-step-state") {
      errors.push(`generated visual step ${step.step}: must use flat-folder-step-state`);
    }
    if (step.animation_source_status !== "solver-backed-pre-post-state") {
      errors.push(`generated visual step ${step.step}: must expose solver-backed pre/post animation source`);
    }
    if (!step.svg?.includes(`Step ${step.step}`)) {
      errors.push(`generated visual step ${step.step}: must preserve step number`);
    }
  }
  if (run?.gate_summary?.step_replay !== "complete") {
    errors.push(`candidate run step_replay must be complete, got ${run?.gate_summary?.step_replay ?? "missing"}`);
  }

  const result = {
    type: "foldgen.generated_step_replay_gate.v1",
    ok: errors.length === 0,
    status: errors.length === 0 ? "passed" : "failed",
    outDir,
    generated_case_id: generatedCase?.case_id ?? null,
    step_count: stepStates?.step_count ?? 0,
    solver_backed_step_count: stepStates?.solver_backed_step_count ?? 0,
    step_visual_source: stepVisuals?.display_source_status ?? null,
    errors
  };
  await writeJson(join(outDir, "m33-generated-step-replay.json"), result);
  return result;
}

export async function runGeneratedExecutorFeasibilityGate(options = {}) {
  const outDir = options.outDir ?? "out/m34-generated-executor-feasibility";
  const pipelineOutDir = join(outDir, "pipeline");
  await mkdir(outDir, { recursive: true });
  const pipelineSummary = await runCuratedPipeline({ outDir: pipelineOutDir });
  const { generatedCase, caseDir, run, displayDecision, errors } = await loadGeneratedArtifacts({ pipelineSummary, pipelineOutDir });
  const overlays = caseDir ? await readJson(join(caseDir, "executor-overlays", "executor-overlays.json"), errors, "executor-overlays") : null;
  const stepVisuals = caseDir ? await readJson(join(caseDir, "step-visuals.json"), errors, "step-visuals") : null;
  const requiredProfiles = generatedCase?.executor_profiles ?? [];

  if (overlays?.status !== "complete") {
    errors.push(`generated executor overlays must be complete, got ${overlays?.status ?? "missing"}`);
  }
  if (overlays && overlays.profile_count !== requiredProfiles.length) {
    errors.push("executor overlay profile count must match case executor profiles");
  }
  for (const profile of requiredProfiles) {
    const steps = stepVisuals?.profile_steps?.[profile] ?? [];
    if (steps.length !== generatedCase?.selected_operation_count) {
      errors.push(`${profile}: missing generated profile step overlays`);
    }
    for (const step of steps) {
      if (step.executor_overlay?.geometry_binding?.operation_id !== step.operation_id) {
        errors.push(`${profile} step ${step.step}: overlay must bind to operation geometry`);
      }
      if (!Array.isArray(step.executor_overlay?.zones) || step.executor_overlay.zones.length === 0) {
        errors.push(`${profile} step ${step.step}: overlay must include contact zones`);
      }
    }
  }
  const catStep = stepVisuals?.profile_steps?.["cat-paw-profile"]?.[0];
  if (catStep?.executor_overlay?.status !== "precision-actions-blocked-or-fixture-needed") {
    errors.push("cat paw profile must retain profile-specific precision limitation evidence");
  }
  if (run?.gate_summary?.executor_overlays !== "complete") {
    errors.push(`candidate run executor_overlays must be complete, got ${run?.gate_summary?.executor_overlays ?? "missing"}`);
  }
  if (displayDecision?.display_mode !== "completed-usable-generated") {
    errors.push("executor feasibility gate must keep generated display completed only after overlays pass");
  }

  const result = {
    type: "foldgen.generated_executor_feasibility_gate.v1",
    ok: errors.length === 0,
    status: errors.length === 0 ? "passed" : "failed",
    outDir,
    generated_case_id: generatedCase?.case_id ?? null,
    overlay_status: overlays?.status ?? null,
    profile_count: overlays?.profile_count ?? 0,
    required_profiles: requiredProfiles,
    cat_paw_status: catStep?.executor_overlay?.status ?? null,
    errors
  };
  await writeJson(join(outDir, "m34-generated-executor-feasibility.json"), result);
  return result;
}

export async function runGeneratedPreviewReviewGate(options = {}) {
  const outDir = options.outDir ?? "out/m35-generated-preview-review";
  const pipelineOutDir = options.pipelineOutDir ?? "out/m2-pipeline";
  const localReview = await runLocalPreviewReviewGate({
    ...options,
    outDir: join(outDir, "local-preview-review"),
    pipelineOutDir,
    extraFixtures: [
      {
        label: "foldgen-generated-triangle-graduated",
        urlCase: GENERATED_CASE_ID,
        query: "step=1",
        expectedState: "Success",
        expectedWebgl: true,
        expectedStepWebgl: true,
        expectedStepOverlayProfile: "human-hand",
        expectedStepAnimated: true,
        expectedDisplayText: "generated completed usable folded-state walkthrough",
        expectedStepText: "Step 1"
      },
      {
        label: "foldgen-generated-triangle-cat-overlay",
        urlCase: GENERATED_CASE_ID,
        query: "profile=cat-paw-profile&step=1",
        expectedState: "Success",
        expectedWebgl: true,
        expectedStepWebgl: true,
        expectedStepOverlayProfile: "cat-paw-profile",
        expectedStepAnimated: true,
        expectedDisplayText: "generated completed usable folded-state walkthrough",
        expectedStepText: "Step 1",
        expectedProfileText: "Cat paw",
        expectedOverlayText: "precision-actions-blocked-or-fixture-needed",
        compareStepCanvasWith: "foldgen-generated-triangle-graduated"
      }
    ]
  });
  await mkdir(outDir, { recursive: true });
  const generatedCases = (localReview.cases ?? []).filter((entry) => entry.label.startsWith("foldgen-generated-triangle"));
  const errors = [...(localReview.errors ?? [])];
  if (generatedCases.length < 2) {
    errors.push("generated preview review must inspect human and cat generated fixtures");
  }
  for (const inspection of generatedCases) {
    if (!inspection.ok) {
      errors.push(`${inspection.label}: generated preview inspection failed`);
    }
    if (inspection.step_animated !== true || inspection.step_frame_count < 2) {
      errors.push(`${inspection.label}: generated step preview must animate pre/post frames`);
    }
    if (inspection.active_step_tab !== "1") {
      errors.push(`${inspection.label}: selected step tab must remain 1`);
    }
  }
  const boat = (localReview.cases ?? []).find((entry) => entry.label === "foldgen-boat-blocked-production");
  if (boat?.has_webgl_canvas !== false || boat?.state !== "Partial") {
    errors.push("boat preview must remain blocked/partial without completed WebGL");
  }

  const result = {
    type: "foldgen.generated_preview_review_gate.v1",
    ok: errors.length === 0,
    status: errors.length === 0 ? "passed" : "failed",
    outDir,
    local_review_path: join(outDir, "local-preview-review", "m29-local-preview-review.json"),
    qa_dir: localReview.qa_dir,
    generated_cases: generatedCases,
    boat: boat ?? null,
    errors
  };
  await writeJson(join(outDir, "m35-generated-preview-review.json"), result);
  return result;
}

export async function runOriginalGapClosureAuditGate(options = {}) {
  const outDir = options.outDir ?? "out/m36-original-gap-closure-audit";
  const pipelineOutDir = join(outDir, "pipeline");
  await mkdir(outDir, { recursive: true });
  const pipelineSummary = await runCuratedPipeline({ outDir: pipelineOutDir });
  const previewReview = await runGeneratedPreviewReviewGate({
    ...options,
    outDir: join(outDir, "preview-review"),
    pipelineOutDir
  });
  const errors = [];
  const evidence = [];

  const generatedCase = pipelineSummary.cases.find((entry) => entry.case_id === GENERATED_CASE_ID) ?? null;
  const squarePacket = pipelineSummary.cases.find((entry) => entry.case_id === "known-good-square-packet") ?? null;
  const flower = pipelineSummary.cases.find((entry) => entry.case_id === "simple-flower") ?? null;
  const boat = pipelineSummary.cases.find((entry) => entry.case_id === BOAT_CASE_ID) ?? null;
  const generatedHuman = previewReview.generated_cases?.find((entry) => entry.label === "foldgen-generated-triangle-graduated") ?? null;
  const generatedCat = previewReview.generated_cases?.find((entry) => entry.label === "foldgen-generated-triangle-cat-overlay") ?? null;
  const blockedBoat = previewReview.boat ?? null;
  const localReview = await readJson(join(outDir, "preview-review", "local-preview-review", "m29-local-preview-review.json"), errors, "local-preview-review");
  const squarePacketReview = localReview?.cases?.find((entry) => entry.label === "foldgen-square-packet-completed-usable") ?? null;
  const flowerReview = localReview?.cases?.find((entry) => entry.label === "foldgen-flower-step-five-selected") ?? null;
  const stepContentUniqueness = await evaluateStepContentUniqueness(pipelineSummary);

  check("completed output uses WebGL/Three.js from backend state", {
    pass: generatedHuman?.has_webgl_canvas === true
      && generatedHuman?.renderer === "solver-backed-folded-state"
      && generatedCase?.display_decision?.render_source === "folded-state.fold",
    evidence,
    errors,
    details: {
      case_id: GENERATED_CASE_ID,
      renderer: generatedHuman?.renderer ?? null,
      render_source: generatedCase?.display_decision?.render_source ?? null,
      screenshot_path: generatedHuman?.screenshot_path ?? null
    }
  });

  check("selected step view is real pre/post WebGL animation", {
    pass: generatedHuman?.has_step_webgl_canvas === true
      && generatedHuman?.step_renderer === "solver-backed-step-state"
      && generatedHuman?.step_animated === true
      && generatedHuman?.step_frame_count >= 2
      && generatedHuman?.step_canvas_hash_before
      && generatedHuman?.step_canvas_hash
      && generatedHuman.step_canvas_hash_before !== generatedHuman.step_canvas_hash,
    evidence,
    errors,
    details: {
      case_id: GENERATED_CASE_ID,
      step_renderer: generatedHuman?.step_renderer ?? null,
      step_frame_count: generatedHuman?.step_frame_count ?? 0,
      before_hash: generatedHuman?.step_canvas_hash_before ?? null,
      after_hash: generatedHuman?.step_canvas_hash ?? null
    }
  });

  check("specific step selection preserves clicked step number and content", {
    pass: flowerReview?.active_step_tab === "5"
      && flowerReview?.step_detail_text?.includes("Step 5")
      && containsOnlyStepHeading(flowerReview?.step_detail_text ?? "", 5),
    evidence,
    errors,
    details: {
      case_id: "simple-flower",
      active_step_tab: flowerReview?.active_step_tab ?? null,
      screenshot_path: flowerReview?.screenshot_path ?? null
    }
  });

  check("multi-step walkthrough content is not repeated boilerplate", {
    pass: stepContentUniqueness.ok,
    evidence,
    errors,
    details: stepContentUniqueness.details
  });

  check("step 1 vs later step changes are pixel-detected when backend states differ", {
    pass: squarePacketReview?.step_animated === true
      && squarePacketReview?.step_canvas_hash_before
      && squarePacketReview?.step_canvas_hash
      && squarePacketReview.step_canvas_hash_before !== squarePacketReview.step_canvas_hash
      && squarePacket?.selected_operation_count >= 2,
    evidence,
    errors,
    details: {
      case_id: "known-good-square-packet",
      selected_operation_count: squarePacket?.selected_operation_count ?? 0,
      before_hash: squarePacketReview?.step_canvas_hash_before ?? null,
      after_hash: squarePacketReview?.step_canvas_hash ?? null
    }
  });

  check("human and cat executor effects are present in browser QA", {
    pass: generatedHuman?.executor_caption?.includes("Human hand")
      && generatedHuman?.step_overlay_profile === "human-hand"
      && generatedCat?.executor_caption?.includes("Cat paw")
      && generatedCat?.step_overlay_profile === "cat-paw-profile",
    evidence,
    errors,
    details: {
      human_caption: generatedHuman?.executor_caption ?? null,
      human_overlay_profile: generatedHuman?.step_overlay_profile ?? null,
      cat_caption: generatedCat?.executor_caption ?? null,
      cat_overlay_profile: generatedCat?.step_overlay_profile ?? null
    }
  });

  check("executor profiles are geometry-linked and visually distinct", {
    pass: generatedCat?.step_overlay_profile === "cat-paw-profile"
      && generatedCat?.step_overlay_zone_count >= 1
      && generatedHuman?.step_canvas_hash
      && generatedCat?.step_canvas_hash
      && generatedHuman.step_canvas_hash !== generatedCat.step_canvas_hash,
    evidence,
    errors,
    details: {
      human_hash: generatedHuman?.step_canvas_hash ?? null,
      cat_hash: generatedCat?.step_canvas_hash ?? null,
      cat_overlay_profile: generatedCat?.step_overlay_profile ?? null,
      cat_overlay_zone_count: generatedCat?.step_overlay_zone_count ?? 0
    }
  });

  check("decorative dashed helper lines are absent from step SVGs", {
    pass: await noStepSvgDasharray(pipelineOutDir),
    evidence,
    errors,
    details: {
      policy: "step SVGs may show current active fold line and executor overlay only; dashed helper lines are not allowed"
    }
  });

  check("boat cannot render as completed while solver evidence fails", {
    pass: boat?.display_mode === "blocked-solver"
      && boat?.display_decision?.safe_to_render_completed_card === false
      && blockedBoat?.has_webgl_canvas === false
      && blockedBoat?.state === "Partial",
    evidence,
    errors,
    details: {
      case_id: BOAT_CASE_ID,
      display_mode: boat?.display_mode ?? null,
      flat_folder_state: boat?.external_validation?.flat_folder_state?.status ?? null,
      has_webgl_canvas: blockedBoat?.has_webgl_canvas ?? null,
      preview_state: blockedBoat?.state ?? null
    }
  });

  check("generated success is not conflated with known-good tutorial success", {
    pass: generatedCase?.display_mode === "completed-usable-generated"
      && generatedCase?.generated_candidate === true
      && generatedCase?.artifact_paths?.candidate_recipe
      && generatedCase?.artifact_paths?.candidate_run,
    evidence,
    errors,
    details: {
      case_id: GENERATED_CASE_ID,
      display_mode: generatedCase?.display_mode ?? null,
      generated_candidate: generatedCase?.generated_candidate ?? null,
      candidate_recipe: generatedCase?.artifact_paths?.candidate_recipe ?? null,
      candidate_run: generatedCase?.artifact_paths?.candidate_run ?? null
    }
  });

  check("no arbitrary generation or physical embodiment claim is made", {
    pass: pipelineSummary.claim_status?.embodiment_validated === false
      && pipelineSummary.claim_status?.claim_label === "simulator-invalid / executor-readable / embodiment-untested"
      && generatedCase?.claim_status?.embodiment_validated === false,
    evidence,
    errors,
    details: {
      summary_claim_label: pipelineSummary.claim_status?.claim_label ?? null,
      summary_embodiment_validated: pipelineSummary.claim_status?.embodiment_validated ?? null,
      generated_embodiment_validated: generatedCase?.claim_status?.embodiment_validated ?? null
    }
  });

  if (previewReview.ok !== true) {
    errors.push("generated preview review gate must pass before original gap closure can pass");
  }

  const result = {
    type: "foldgen.original_gap_closure_audit.v1",
    ok: errors.length === 0,
    status: errors.length === 0 ? "passed" : "failed",
    outDir,
    pipeline_out_dir: pipelineOutDir,
    preview_review_path: join(outDir, "preview-review", "m35-generated-preview-review.json"),
    requirement_count: evidence.length,
    evidence,
    errors
  };
  await writeJson(join(outDir, "m36-original-gap-closure-audit.json"), result);
  return result;
}

async function loadGeneratedArtifacts({ pipelineSummary, pipelineOutDir }) {
  const errors = [];
  const generatedCase = pipelineSummary.cases.find((entry) => entry.case_id === GENERATED_CASE_ID) ?? null;
  if (!generatedCase) {
    errors.push(`missing ${GENERATED_CASE_ID} in pipeline summary`);
    return { generatedCase: null, caseDir: null, recipe: null, run: null, displayDecision: null, errors };
  }
  const caseDir = join(pipelineOutDir, generatedCase.case_id);
  const recipe = await readJson(join(caseDir, "candidate-recipe.json"), errors, "candidate-recipe");
  const run = await readJson(join(caseDir, "candidate-run.json"), errors, "candidate-run");
  const displayDecision = await readJson(join(caseDir, "display-decision.json"), errors, "display-decision");
  return { generatedCase, caseDir, recipe, run, displayDecision, errors };
}

function buildGeneratedWrongTargetFixture({ generatedCase }) {
  const targetStatus = generatedCase?.external_validation?.target_match?.status ?? "missing";
  return {
    type: "foldgen.generated_wrong_target_fixture.v1",
    status: targetStatus === "passed" ? "rejected-target-match" : "missing-positive-target",
    source_case_id: generatedCase?.case_id ?? null,
    source_candidate_id: generatedCase?.selected_candidate_id ?? null,
    policy: "A generated candidate may pass only for its scored target; using the same backend state for a mismatched target is rejected by target-match.",
    simulated_wrong_target: "known-good-corner.svg",
    rejection_reason: "target-match-threshold-not-met-for-mismatched-target"
  };
}

async function readJson(path, errors, label) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    errors.push(`${label}: missing or invalid JSON at ${path} (${error.message})`);
    return null;
  }
}

async function noStepSvgDasharray(pipelineOutDir) {
  const summary = JSON.parse(await readFile(join(pipelineOutDir, "summary.json"), "utf8"));
  for (const pipelineCase of summary.cases ?? []) {
    if (!pipelineCase.artifact_paths?.step_visuals) {
      return false;
    }
    const stepVisuals = JSON.parse(await readFile(pipelineCase.artifact_paths.step_visuals, "utf8"));
    const allSteps = [
      ...(stepVisuals.steps ?? []),
      ...Object.values(stepVisuals.profile_steps ?? {}).flat()
    ];
    if (allSteps.some((step) => /stroke-dasharray/.test(step.svg ?? ""))) {
      return false;
    }
  }
  return true;
}

async function evaluateStepContentUniqueness(pipelineSummary) {
  const cases = [];
  const errors = [];
  for (const pipelineCase of pipelineSummary.cases ?? []) {
    if ((pipelineCase.selected_operation_count ?? 0) < 2) {
      continue;
    }
    const sequencePath = pipelineCase.artifact_paths?.diagram_sequence;
    if (!sequencePath) {
      errors.push(`${pipelineCase.case_id}: missing diagram_sequence path`);
      cases.push({
        case_id: pipelineCase.case_id,
        status: "failed",
        reason: "missing diagram_sequence path"
      });
      continue;
    }
    try {
      const sequence = JSON.parse(await readFile(sequencePath, "utf8"));
      const signatures = (sequence.steps ?? []).map((step) => [
        step.step,
        step.title,
        step.instruction,
        step.fold?.landmarks?.line,
        step.fold_direction?.direction ?? step.fold_direction?.text
      ].join("|"));
      const uniqueSignatureCount = new Set(signatures).size;
      const status = uniqueSignatureCount > 1 && signatures.length === sequence.step_count
        ? "passed"
        : "failed";
      cases.push({
        case_id: pipelineCase.case_id,
        status,
        step_count: sequence.step_count ?? 0,
        unique_signature_count: uniqueSignatureCount
      });
      if (status !== "passed") {
        errors.push(`${pipelineCase.case_id}: multi-step sequence content is repeated or incomplete`);
      }
    } catch (error) {
      errors.push(`${pipelineCase.case_id}: cannot read diagram sequence (${error.message})`);
      cases.push({
        case_id: pipelineCase.case_id,
        status: "failed",
        reason: error.message
      });
    }
  }
  return {
    ok: cases.length > 0 && errors.length === 0,
    details: {
      checked_case_count: cases.length,
      cases
    }
  };
}

function containsOnlyStepHeading(text, expectedStep) {
  const headings = [...text.matchAll(/Step\s+(\d+)\s+-/g)].map((match) => Number(match[1]));
  return headings.length === 1 && headings[0] === expectedStep;
}

function check(requirement, { pass, evidence, errors, details }) {
  const ok = Boolean(pass);
  evidence.push({
    requirement,
    status: ok ? "passed" : "failed",
    details
  });
  if (!ok) {
    errors.push(`${requirement}: failed`);
  }
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${stableStringify(value, 2)}\n`, "utf8");
}

function toRepoPath(path) {
  return relative(process.cwd(), path).split("\\").join("/");
}
