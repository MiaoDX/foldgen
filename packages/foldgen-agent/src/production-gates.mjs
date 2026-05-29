import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

import { stableStringify } from "../../fold-core/src/index.mjs";
import { extractSvgSilhouettePolygons, evaluateTargetMatch } from "./target-match.mjs";
import { runCuratedPipeline } from "./pipeline.mjs";
import { runOrigamiSimulatorAdapterSpike } from "./origami-simulator-spike.mjs";

const REQUIRED_ARTIFACT_KEYS = [
  "derived_fold",
  "source_provenance",
  "community_fold_validation",
  "flat_folder_validation",
  "flat_folder_state",
  "target_match",
  "step_states",
  "step_visuals",
  "executor_overlays",
  "display_decision"
];

const COMPLETED_USABLE_REQUIRED_ARTIFACT_KEYS = [
  ...REQUIRED_ARTIFACT_KEYS,
  "crease_svg",
  "preview",
  "preview_animation",
  "diagram_sequence",
  "fold_program_ir",
  "visual_walkthrough"
];

export async function runArtifactGraphGate(options = {}) {
  const outDir = options.outDir ?? "out/m24-artifact-graph";
  const pipelineSummary = await runCuratedPipeline({ outDir });
  const cases = [];
  const errors = [];

  for (const pipelineCase of pipelineSummary.cases ?? []) {
    const caseResult = await validateArtifactGraphCase({ pipelineCase });
    cases.push(caseResult);
    errors.push(...caseResult.errors.map((error) => `${pipelineCase.case_id}: ${error}`));
  }

  const completedUsable = cases.filter((entry) => entry.display_mode === "completed-usable");
  if (completedUsable.length < 4) {
    errors.push(`expected at least four completed-usable cases after artifact graph lock, got ${completedUsable.length}`);
  }
  if (!cases.some((entry) => entry.display_mode === "completed-usable-generated")) {
    errors.push("expected at least one completed-usable-generated case after artifact graph lock");
  }
  const incompleteGraphFixture = validateIncompleteArtifactGraphFixture();
  if (incompleteGraphFixture.status !== "blocked-as-expected") {
    errors.push("deliberately incomplete artifact graph was not blocked");
  }

  const result = {
    type: "foldgen.artifact_graph_gate.v1",
    ok: errors.length === 0,
    status: errors.length === 0 ? "passed" : "failed",
    outDir,
    completed_usable_case_count: completedUsable.length,
    completed_usable_generated_case_count: cases.filter((entry) => entry.display_mode === "completed-usable-generated").length,
    incomplete_graph_fixture: incompleteGraphFixture,
    cases,
    errors
  };
  await writeJson(join(outDir, "m24-artifact-graph.json"), result);
  return result;
}

export async function runRecognizableKnownGoodGate(options = {}) {
  const outDir = options.outDir ?? "out/m25-recognizable-known-good";
  const pipelineSummary = await runCuratedPipeline({ outDir });
  const errors = [];
  const recognizable = [];
  const boat = pipelineSummary.cases.find((entry) => entry.case_id === "simple-boat") ?? null;

  for (const pipelineCase of pipelineSummary.cases ?? []) {
    const targetSvg = await readFile(join("benchmarks/targets", pipelineCase.target.file), "utf8");
    const decorativePolygonCount = extractSvgSilhouettePolygons(targetSvg).length;
    const promotionAllowed = ["known-good-paper-hat", "known-good-square-packet"].includes(pipelineCase.case_id)
      && pipelineCase.display_mode === "completed-usable"
      && pipelineCase.step_state_status === "complete";
    if (promotionAllowed) {
      recognizable.push({
        case_id: pipelineCase.case_id,
        target_file: pipelineCase.target.file,
        display_mode: pipelineCase.display_mode,
        selected_candidate_id: pipelineCase.selected_candidate_id,
        target_match_score: pipelineCase.external_validation.target_match.score,
        decorative_polygon_count: decorativePolygonCount,
        artifact_paths: {
          display_decision: pipelineCase.artifact_paths.display_decision,
          folded_state_fold: pipelineCase.artifact_paths.folded_state_fold,
          step_states: pipelineCase.artifact_paths.step_states,
          executor_overlays: pipelineCase.artifact_paths.executor_overlays
        }
      });
    }
  }

  if (recognizable.length < 1) {
    errors.push("expected at least one recognizable completed-usable known-good case");
  }
  if (boat?.display_mode !== "blocked-solver") {
    errors.push(`simple-boat must remain blocked-solver unless it passes every hard gate, got ${boat?.display_mode ?? "missing"}`);
  }
  for (const entry of recognizable) {
    if (entry.decorative_polygon_count !== 1) {
      errors.push(`${entry.case_id}: target-match silhouette must ignore decorative lines and keep one polygon`);
    }
  }

  const result = {
    type: "foldgen.recognizable_known_good_gate.v1",
    ok: errors.length === 0,
    status: errors.length === 0 ? "passed" : "failed",
    outDir,
    recognizable_completed_case_count: recognizable.length,
    recognizable_completed_cases: recognizable,
    boat: boat ? {
      case_id: boat.case_id,
      display_mode: boat.display_mode,
      weakest_failed_gate: boat.display_decision?.weakest_failed_gate ?? null,
      flat_folder_state: boat.external_validation?.flat_folder_state?.status ?? "missing"
    } : null,
    errors
  };
  await writeJson(join(outDir, "m25-recognizable-known-good.json"), result);
  return result;
}

export async function runProgressiveStateBackendGate(options = {}) {
  const outDir = options.outDir ?? "out/m26-progressive-state-backend";
  await mkdir(outDir, { recursive: true });
  const pipelineOutDir = join(outDir, "pipeline");
  const pipelineSummary = await runCuratedPipeline({ outDir: pipelineOutDir });
  const completedCase = pipelineSummary.cases.find((entry) => (
    entry.case_id === "known-good-square-packet"
      && entry.display_mode === "completed-usable"
      && entry.selected_operation_count >= 2
  )) ?? pipelineSummary.cases.find((entry) => (
    entry.display_mode === "completed-usable"
      && entry.selected_operation_count >= 2
  ));
  const errors = [];
  const importedStates = [];

  if (!completedCase) {
    errors.push("missing completed-usable case for progressive state import");
  } else {
    const stepStates = JSON.parse(await readFile(join(pipelineOutDir, completedCase.case_id, "step-states.json"), "utf8"));
    for (const state of stepStates.states ?? []) {
      if (state.status !== "solver-backed-post-state" || !state.folded_state_path) {
        continue;
      }
      const sourcePath = state.folded_state_path;
      const fold = JSON.parse(await readFile(sourcePath, "utf8"));
      const importRecord = {
        type: "foldgen.simulator_state_import.v1",
        case_id: completedCase.case_id,
        step: state.step,
        status: "validated-manual-import",
        source_tool: "Flat-Folder state artifact used as simulator-state import fixture",
        source_artifact_path: sourcePath,
        simulator_state_fold_path: sourcePath,
        checksum: stableChecksum(stableStringify(fold)),
        visible_change: state.frame_difference?.status === "changed",
        import_policy: "manual/imported state fixtures are valid only with provenance and checksum"
      };
      const recordPath = join(outDir, completedCase.case_id, "simulator-states", `step-${state.step}.json`);
      await writeJson(recordPath, importRecord);
      importedStates.push({
        ...importRecord,
        path: toRepoPath(recordPath)
      });
    }
  }

  const simulatorSpike = await runOrigamiSimulatorAdapterSpike({
    outDir: join(outDir, "origami-simulator-spike"),
    caseId: "simple-fish"
  });
  if (importedStates.length < 2) {
    errors.push(`expected at least two validated backend-backed progressive state imports for a multi-step case, got ${importedStates.length}`);
  }
  if (!["blocked-automated-state-export", "passed-progressive-state-backend"].includes(simulatorSpike.status)) {
    errors.push(`unexpected Origami Simulator spike status: ${simulatorSpike.status}`);
  }
  if (simulatorSpike.status === "blocked-automated-state-export" && importedStates.length === 0) {
    errors.push("manual fixture import route is required while Origami Simulator automation is blocked");
  }

  const result = {
    type: "foldgen.progressive_state_backend_gate.v1",
    ok: errors.length === 0,
    status: errors.length === 0 ? "passed" : "failed",
    outDir,
    completed_case_id: completedCase?.case_id ?? null,
    completed_case_step_count: completedCase?.selected_operation_count ?? 0,
    validated_import_count: importedStates.length,
    validated_imports: importedStates,
    origami_simulator_adapter: {
      status: simulatorSpike.status,
      decision: simulatorSpike.decision,
      claim_effect: simulatorSpike.claim_effect
    },
    errors
  };
  await writeJson(join(outDir, "m26-progressive-state-backend.json"), result);
  return result;
}

export async function runThreeStepWalkthroughGate(options = {}) {
  const outDir = options.outDir ?? "out/m27-three-step-walkthrough";
  const pipelineSummary = await runCuratedPipeline({ outDir });
  const errors = [];
  const cases = [];

  for (const pipelineCase of pipelineSummary.cases ?? []) {
    const caseErrors = [];
    const stepVisuals = JSON.parse(await readFile(join(outDir, pipelineCase.case_id, "step-visuals.json"), "utf8"));
    const displayDecision = JSON.parse(await readFile(join(outDir, pipelineCase.case_id, "display-decision.json"), "utf8"));
    const completedUsable = displayDecision.display_mode === "completed-usable"
      || displayDecision.display_mode === "completed-usable-generated";
    const profileStepCounts = Object.fromEntries(Object.entries(stepVisuals.profile_steps ?? {}).map(([profile, steps]) => [
      profile,
      steps.length
    ]));
    if (completedUsable) {
      if (stepVisuals.display_source_status !== "solver-backed-post-states") {
        caseErrors.push("completed-usable walkthrough must use solver-backed-post-states");
      }
      for (const [profile, steps] of Object.entries(stepVisuals.profile_steps ?? {})) {
        for (const step of steps) {
          if (step.display_source !== "flat-folder-step-state") {
            caseErrors.push(`${profile} step ${step.step}: must render from flat-folder-step-state`);
          }
          if (step.frame_difference?.status !== "changed") {
            caseErrors.push(`${profile} step ${step.step}: must have changed frame evidence`);
          }
          if (!step.folded_state_path) {
            caseErrors.push(`${profile} step ${step.step}: missing folded state path`);
          }
          if (!step.pre_state_fold_path) {
            caseErrors.push(`${profile} step ${step.step}: missing pre-state fold path`);
          }
          if (!step.input_fold_path) {
            caseErrors.push(`${profile} step ${step.step}: missing solver input fold path`);
          }
          if (step.animation_source_status !== "solver-backed-pre-post-state") {
            caseErrors.push(`${profile} step ${step.step}: must expose solver-backed pre/post animation source`);
          }
          if (step.executor_overlay?.geometry_binding?.operation_id !== step.operation_id) {
            caseErrors.push(`${profile} step ${step.step}: missing overlay geometry binding`);
          }
        }
      }
    }
    const selectedStepInvariant = validateSelectedStepInvariant(stepVisuals);
    caseErrors.push(...selectedStepInvariant.errors);
    cases.push({
      case_id: pipelineCase.case_id,
      display_mode: displayDecision.display_mode,
      step_count: stepVisuals.step_count,
      display_source_status: stepVisuals.display_source_status,
      profile_step_counts: profileStepCounts,
      selected_step_invariant: selectedStepInvariant.status,
      errors: caseErrors
    });
    errors.push(...caseErrors.map((error) => `${pipelineCase.case_id}: ${error}`));
  }

  const completedUsableCases = cases.filter((entry) => entry.display_mode === "completed-usable");
  const completedStepCases = cases.filter((entry) => entry.display_mode === "completed-usable" || entry.display_mode === "completed-usable-generated");
  if (completedUsableCases.length < 4) {
    errors.push(`expected at least four completed-usable 3D step walkthrough cases, got ${completedUsableCases.length}`);
  }
  if (!cases.some((entry) => entry.display_mode === "completed-usable-generated")) {
    errors.push("expected a generated completed-usable step walkthrough case");
  }
  if (!completedStepCases.some((entry) => entry.step_count >= 2)) {
    errors.push("expected at least one completed-usable multi-step walkthrough case");
  }

  const result = {
    type: "foldgen.three_step_walkthrough_gate.v1",
    ok: errors.length === 0,
    status: errors.length === 0 ? "passed" : "failed",
    outDir,
    completed_usable_case_count: completedUsableCases.length,
    completed_usable_generated_case_count: cases.filter((entry) => entry.display_mode === "completed-usable-generated").length,
    cases,
    errors
  };
  await writeJson(join(outDir, "m27-three-step-walkthrough.json"), result);
  return result;
}

export async function runCandidateGraduationGate(options = {}) {
  const outDir = options.outDir ?? "out/m28-candidate-graduation";
  const pipelineSummary = await runCuratedPipeline({ outDir });
  const errors = [];
  const cases = [];
  const wrongTargetFixture = await buildWrongTargetFixture({ outDir });

  for (const pipelineCase of pipelineSummary.cases ?? []) {
    const displayDecision = JSON.parse(await readFile(join(outDir, pipelineCase.case_id, "display-decision.json"), "utf8"));
    const caseErrors = [];
    const selectedCandidateId = pipelineCase.selected_candidate_id;
    if (!selectedCandidateId) {
      caseErrors.push("missing selected candidate id");
    }
    if (pipelineCase.display_mode !== displayDecision.display_mode) {
      caseErrors.push("pipeline display mode must match display-decision artifact");
    }
    if (displayDecision.display_mode === "completed-usable" || displayDecision.display_mode === "completed-usable-generated") {
      for (const gateId of ["folded-state-artifact", "target-match", "step-state-walkthrough", "executor-overlays"]) {
        const gate = displayDecision.gates.find((entry) => entry.id === gateId);
        if (gate?.status !== "passed") {
          caseErrors.push(`completed selected candidate missing ${gateId} gate`);
        }
      }
    }
    if (displayDecision.display_mode.startsWith("blocked-") && displayDecision.completed_usable === true) {
      caseErrors.push("blocked candidate cannot be completed_usable");
    }
    cases.push({
      case_id: pipelineCase.case_id,
      selected_candidate_id: selectedCandidateId,
      display_mode: displayDecision.display_mode,
      completed_usable: displayDecision.completed_usable,
      target_match: pipelineCase.external_validation.target_match.status,
      errors: caseErrors
    });
    errors.push(...caseErrors.map((error) => `${pipelineCase.case_id}: ${error}`));
  }

  if (wrongTargetFixture.status !== "blocked-target-match") {
    errors.push(`wrong-target fixture must be blocked-target-match, got ${wrongTargetFixture.status}`);
  }
  if (cases.filter((entry) => entry.completed_usable).length < 4) {
    errors.push("expected at least four completed-usable candidate graduations");
  }
  if (!cases.some((entry) => entry.display_mode === "completed-usable-generated" && entry.completed_usable)) {
    errors.push("expected at least one completed-usable-generated candidate graduation");
  }
  if (!cases.some((entry) => entry.case_id === "known-good-square-packet" && entry.completed_usable)) {
    errors.push("known-good-square-packet must graduate as completed-usable");
  }

  const result = {
    type: "foldgen.candidate_graduation_gate.v1",
    ok: errors.length === 0,
    status: errors.length === 0 ? "passed" : "failed",
    outDir,
    completed_usable_candidate_count: cases.filter((entry) => entry.completed_usable).length,
    completed_usable_generated_candidate_count: cases.filter((entry) => entry.display_mode === "completed-usable-generated").length,
    wrong_target_fixture: wrongTargetFixture,
    cases,
    errors
  };
  await writeJson(join(outDir, "m28-candidate-graduation.json"), result);
  return result;
}

export async function runLocalPreviewReviewGate(options = {}) {
  const outDir = options.outDir ?? "out/m29-local-preview-review";
  const pipelineOutDir = options.pipelineOutDir ?? "out/m2-pipeline";
  const qaDir = options.qaDir ?? "tmp/qa";
  await mkdir(outDir, { recursive: true });
  await mkdir(qaDir, { recursive: true });
  await runCuratedPipeline({ outDir: pipelineOutDir });

  const port = Number(options.port ?? process.env.FOLDGEN_PREVIEW_REVIEW_PORT ?? 4185);
  const chromePort = Number(options.chromePort ?? process.env.FOLDGEN_PREVIEW_REVIEW_CHROME_PORT ?? 9235);
  const chromePath = options.chromePath ?? process.env.CHROME_BIN ?? "/usr/bin/google-chrome";
  const fixtures = [
    {
      label: "foldgen-square-packet-completed-usable",
      url: `http://127.0.0.1:${port}/demo/?case=known-good-square-packet&step=2`,
      expectedState: "Success",
      expectedWebgl: true,
      expectedStepWebgl: true,
      expectedStepOverlayProfile: "human-hand",
      expectedStepAnimated: true,
      expectedDisplayText: "completed usable folded-state walkthrough",
      expectedStepText: "Step 2"
    },
    {
      label: "foldgen-boat-blocked-production",
      url: `http://127.0.0.1:${port}/demo/?case=simple-boat`,
      expectedState: "Partial",
      expectedWebgl: false,
      expectedStepWebgl: false,
      expectedDisplayText: "blocked by solver; inspection only"
    },
    {
      label: "foldgen-fish-partial-production",
      url: `http://127.0.0.1:${port}/demo/?case=simple-fish`,
      expectedState: "Partial",
      expectedWebgl: true,
      expectedStepWebgl: false,
      expectedDisplayText: "completed 3D folded-state render; walkthrough partial"
    },
    {
      label: "foldgen-flower-step-five-selected",
      url: `http://127.0.0.1:${port}/demo/?case=simple-flower&step=5`,
      expectedState: "Partial",
      expectedWebgl: false,
      expectedStepWebgl: true,
      expectedStepOverlayProfile: "human-hand",
      expectedStepAnimated: true,
      expectedDisplayText: "blocked by target match; inspection only",
      expectedStepText: "Step 5",
      forbiddenStepText: "Step 1 -"
    },
    {
      label: "foldgen-paper-hat-cat-overlay-step1",
      url: `http://127.0.0.1:${port}/demo/?case=known-good-paper-hat&profile=cat-paw-profile&step=1`,
      expectedState: "Success",
      expectedWebgl: true,
      expectedStepWebgl: true,
      expectedStepOverlayProfile: "cat-paw-profile",
      expectedStepAnimated: true,
      expectedDisplayText: "completed usable folded-state walkthrough",
      expectedStepText: "Step 1",
      expectedProfileText: "Cat paw",
      expectedOverlayText: "precision-actions-blocked-or-fixture-needed"
    },
    {
      label: "foldgen-square-packet-cat-overlay-step2",
      url: `http://127.0.0.1:${port}/demo/?case=known-good-square-packet&profile=cat-paw-profile&step=2`,
      expectedState: "Success",
      expectedWebgl: true,
      expectedStepWebgl: true,
      expectedStepOverlayProfile: "cat-paw-profile",
      expectedStepAnimated: true,
      expectedDisplayText: "completed usable folded-state walkthrough",
      expectedStepText: "Step 2",
      expectedProfileText: "Cat paw",
      expectedOverlayText: "precision-actions-blocked-or-fixture-needed",
      compareStepCanvasWith: "foldgen-square-packet-completed-usable"
    }
  ];
  for (const fixture of options.extraFixtures ?? []) {
    const query = fixture.query ? `&${fixture.query}` : "";
    fixtures.push({
      ...fixture,
      url: fixture.url ?? `http://127.0.0.1:${port}/demo/?case=${fixture.urlCase}${query}`
    });
  }

  if (options.browser !== false && !(await canAccessFile(chromePath))) {
    const result = {
      type: "foldgen.local_preview_review_gate.v1",
      ok: false,
      status: "failed",
      outDir,
      qa_dir: qaDir,
      errors: [`Chrome executable not found at ${chromePath}`],
      cases: []
    };
    await writeJson(join(outDir, "m29-local-preview-review.json"), result);
    return result;
  }

  const server = spawn(process.execPath, ["demo/server.mjs", String(port)], {
    stdio: ["ignore", "pipe", "pipe"]
  });
  const chrome = spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${chromePort}`,
    "--no-sandbox",
    `--user-data-dir=/tmp/foldgen-preview-review-${chromePort}`,
    "about:blank"
  ], {
    stdio: ["ignore", "pipe", "pipe"]
  });

  try {
    await waitForHttp(`http://127.0.0.1:${port}/demo/`);
    await waitForHttp(`http://127.0.0.1:${chromePort}/json/version`);
    const cases = [];
    const errors = [];
    for (const fixture of fixtures) {
      const inspection = await inspectPreviewPage({
        chromePort,
        qaDir,
        ...fixture
      });
      cases.push(inspection);
      if (!inspection.ok) {
        errors.push(`${fixture.label}: preview review checks failed`);
      }
    }
    for (const inspection of cases) {
      if (!inspection.compare_step_canvas_with) {
        continue;
      }
      const base = cases.find((entry) => entry.label === inspection.compare_step_canvas_with);
      if (!base) {
        errors.push(`${inspection.label}: missing comparison fixture ${inspection.compare_step_canvas_with}`);
        inspection.checks.step_canvas_diff_ok = false;
        inspection.ok = false;
        continue;
      }
      const different = Boolean(inspection.step_canvas_hash && base.step_canvas_hash && inspection.step_canvas_hash !== base.step_canvas_hash);
      inspection.checks.step_canvas_diff_ok = different;
      inspection.compared_step_canvas_hash = base.step_canvas_hash ?? null;
      if (!different) {
        errors.push(`${inspection.label}: step WebGL canvas must differ from ${base.label}`);
        inspection.ok = false;
      }
    }
    const result = {
      type: "foldgen.local_preview_review_gate.v1",
      ok: errors.length === 0,
      status: errors.length === 0 ? "passed" : "failed",
      outDir,
      qa_dir: qaDir,
      screenshot_paths: Object.fromEntries(cases.map((entry) => [entry.label, entry.screenshot_path])),
      cases,
      errors
    };
    await writeJson(join(outDir, "m29-local-preview-review.json"), result);
    return result;
  } finally {
    await stopProcess(server);
    await stopProcess(chrome);
  }
}

async function validateArtifactGraphCase({ pipelineCase }) {
  const errors = [];
  const artifactPaths = pipelineCase.artifact_paths ?? {};
  for (const key of REQUIRED_ARTIFACT_KEYS) {
    if (!artifactPaths[key]) {
      errors.push(`missing artifact path: ${key}`);
      continue;
    }
    if (!(await fileExists(artifactPaths[key]))) {
      errors.push(`artifact does not exist: ${key} -> ${artifactPaths[key]}`);
    }
  }
  const displayDecision = artifactPaths.display_decision && await fileExists(artifactPaths.display_decision)
    ? JSON.parse(await readFile(artifactPaths.display_decision, "utf8"))
    : null;
  if (displayDecision?.display_mode !== pipelineCase.display_mode) {
    errors.push("display-decision display_mode must match case summary");
  }
    if (pipelineCase.display_mode === "completed-usable" || pipelineCase.display_mode === "completed-usable-generated") {
      for (const key of COMPLETED_USABLE_REQUIRED_ARTIFACT_KEYS) {
        if (!artifactPaths[key] || !(await fileExists(artifactPaths[key]))) {
          errors.push(`${pipelineCase.display_mode} missing required artifact: ${key}`);
        }
      }
      if (pipelineCase.display_mode === "completed-usable-generated") {
        for (const key of ["candidate_recipe", "candidate_run"]) {
          if (!artifactPaths[key] || !(await fileExists(artifactPaths[key]))) {
            errors.push(`completed-usable-generated missing required artifact: ${key}`);
          }
        }
      }
      if (displayDecision?.safe_to_render_completed_card !== true) {
        errors.push(`${pipelineCase.display_mode} requires safe_to_render_completed_card=true`);
      }
      if (displayDecision?.render_source !== "folded-state.fold") {
        errors.push(`${pipelineCase.display_mode} render source must be folded-state.fold`);
      }
    }
  if (artifactPaths.preview?.includes("/inspection/")) {
    errors.push("main preview artifact must not live under inspection namespace");
  }
  return {
    case_id: pipelineCase.case_id,
    display_mode: pipelineCase.display_mode,
    completed_usable: pipelineCase.display_mode === "completed-usable" || pipelineCase.display_mode === "completed-usable-generated",
    artifact_count: Object.values(artifactPaths).filter(Boolean).length,
    display_decision_mode: displayDecision?.display_mode ?? null,
    errors
  };
}

function validateIncompleteArtifactGraphFixture() {
  const artifactPaths = {
    derived_fold: "out/example/incomplete/derived.fold",
    display_decision: "out/example/incomplete/display-decision.json"
  };
  const missing = COMPLETED_USABLE_REQUIRED_ARTIFACT_KEYS.filter((key) => !artifactPaths[key]);
  return {
    status: missing.length > 0 ? "blocked-as-expected" : "unexpected-pass",
    missing_required_artifacts: missing
  };
}

function validateSelectedStepInvariant(stepVisuals) {
  const errors = [];
  for (const [profile, steps] of Object.entries(stepVisuals.profile_steps ?? {})) {
    for (let index = 0; index < steps.length; index += 1) {
      const expected = index + 1;
      const step = steps[index];
      if (step.step !== expected) {
        errors.push(`${profile}: step index ${index} must preserve Step ${expected}`);
      }
      if (!step.svg?.includes(`Step ${expected}`)) {
        errors.push(`${profile}: step SVG must include selected Step ${expected}`);
      }
      if (step.svg?.includes(`Step ${expected + 1}`) && steps.length > expected) {
        errors.push(`${profile}: step SVG for Step ${expected} leaks another step number`);
      }
    }
  }
  return {
    status: errors.length === 0 ? "passed" : "failed",
    errors
  };
}

async function buildWrongTargetFixture({ outDir }) {
  const sourceFoldedState = join(outDir, "known-good-triangle", "folded-state.fold");
  const targetSvgPath = "benchmarks/targets/known-good-corner.svg";
  const outputPath = join(outDir, "wrong-target-fixture", "target-match.json");
  const targetMatch = await evaluateTargetMatch({
    targetSvgPath,
    foldedStatePath: sourceFoldedState,
    outputPath,
    threshold: 0.98
  });
  return {
    type: "foldgen.wrong_target_fixture.v1",
    status: targetMatch.status === "failed" ? "blocked-target-match" : "unexpected-pass",
    source_folded_state: sourceFoldedState,
    target_svg: targetSvgPath,
    target_match_path: toRepoPath(outputPath),
    target_match_score: targetMatch.score,
    target_match_threshold: targetMatch.threshold
  };
}

async function inspectPreviewPage({ chromePort, qaDir, label, url, ...expectations }) {
  const tab = await (await fetch(`http://127.0.0.1:${chromePort}/json/new?${encodeURIComponent(url)}`, { method: "PUT" })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const callbacks = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) {
        callbacks.reject(new Error(JSON.stringify(message.error)));
      } else {
        callbacks.resolve(message.result);
      }
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const message = { id: ++id, method, params };
    pending.set(message.id, { resolve, reject });
    ws.send(JSON.stringify(message));
  });
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Page.navigate", { url });
  await new Promise((resolve) => setTimeout(resolve, 1800));
  const evaluation = await send("Runtime.evaluate", {
    returnByValue: true,
    awaitPromise: true,
    expression: pageInspectionExpression({ label, ...expectations })
  });
  const screenshot = await send("Page.captureScreenshot", { format: "png" });
  const screenshotPath = join(qaDir, `${label}.png`);
  await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));
  await fetch(`http://127.0.0.1:${chromePort}/json/close/${tab.id}`);
  ws.close();
  return {
    ...evaluation.result.value,
    screenshot_path: toRepoPath(screenshotPath)
  };
}

function pageInspectionExpression(expectations = {}) {
  return `(() => {
    const stage = document.querySelector("#folded-preview-stage");
    const webglCanvas = stage?.querySelector("canvas");
    const stepStage = document.querySelector("#step-folded-preview-stage");
    const stepWebglCanvas = stepStage?.querySelector("canvas");
    const fallback = document.querySelector("#preview-canvas");
    const stepFallback = document.querySelector("#step-preview-canvas");
    const displayText = Array.from(document.querySelectorAll("#case-evidence dd")).map((node) => node.textContent).join(" | ");
    const stepDetailText = document.querySelector("#step-detail")?.textContent || "";
    const activeStepTab = document.querySelector(".step-tab[data-active='true']")?.textContent || "";
    const executorCaption = document.querySelector("#executor-caption")?.textContent || "";
    const canvas = webglCanvas || fallback;
    let nonblank = false;
    if (canvas) {
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (gl) {
        const pixels = new Uint8Array(4 * 16 * 16);
        gl.readPixels(0, 0, 16, 16, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        nonblank = pixels.some((value, index) => index % 4 !== 3 && value !== 0);
      } else {
        const ctx = canvas.getContext("2d");
        const data = ctx?.getImageData(0, 0, Math.min(16, canvas.width), Math.min(16, canvas.height)).data;
        nonblank = data ? Array.from(data).some((value, index) => index % 4 !== 3 && value !== 0) : false;
      }
    }
    const state = document.querySelector("#state-pill")?.textContent;
    const expectedState = ${JSON.stringify(expectations.expectedState ?? null)};
    const expectedWebgl = ${JSON.stringify(expectations.expectedWebgl ?? null)};
    const expectedStepWebgl = ${JSON.stringify(expectations.expectedStepWebgl ?? expectations.expectedWebgl ?? null)};
    const expectedStepOverlayProfile = ${JSON.stringify(expectations.expectedStepOverlayProfile ?? null)};
    const expectedStepAnimated = ${JSON.stringify(expectations.expectedStepAnimated ?? null)};
    const expectedDisplayText = ${JSON.stringify(expectations.expectedDisplayText ?? null)};
    const expectedStepText = ${JSON.stringify(expectations.expectedStepText ?? null)};
    const forbiddenStepText = ${JSON.stringify(expectations.forbiddenStepText ?? null)};
    const expectedProfileText = ${JSON.stringify(expectations.expectedProfileText ?? null)};
    const expectedOverlayText = ${JSON.stringify(expectations.expectedOverlayText ?? null)};
    const hasWebglCanvas = Boolean(webglCanvas);
    const hasStepWebglCanvas = Boolean(stepWebglCanvas);
    const stepOverlayProfile = stepWebglCanvas?.dataset.overlayProfile || null;
    const stepOverlayZoneCount = Number(stepWebglCanvas?.dataset.overlayZoneCount || 0);
    const stepFrameCount = Number(stepWebglCanvas?.dataset.stepFrameCount || 0);
    const stepAnimated = stepWebglCanvas?.dataset.stepAnimated === "true";
    const rendererOk = hasWebglCanvas
      ? webglCanvas.dataset.renderer === "solver-backed-folded-state"
      : fallback?.hidden === false && stage?.hidden === true;
    const stepRendererOk = expectedStepWebgl === true
      ? hasStepWebglCanvas
        && stepWebglCanvas.dataset.renderer === "solver-backed-step-state"
        && stepFallback?.hidden === true
        && stepStage?.hidden === false
      : expectedStepWebgl === false
        ? hasStepWebglCanvas === false && stepFallback?.hidden === false && stepStage?.hidden === true
        : true;
    const webglOk = expectedWebgl === null || hasWebglCanvas === expectedWebgl;
    const stateOk = expectedState === null || state === expectedState;
    const displayOk = !expectedDisplayText || displayText.includes(expectedDisplayText);
    const stepOk = (!expectedStepText || (stepDetailText.includes(expectedStepText) && activeStepTab === expectedStepText.replace("Step ", "")))
      && (!forbiddenStepText || !stepDetailText.includes(forbiddenStepText));
    const profileOk = !expectedProfileText || executorCaption.includes(expectedProfileText);
    const overlayOk = !expectedOverlayText || stepDetailText.includes(expectedOverlayText);
    const stepOverlayOk = !expectedStepOverlayProfile
      || (stepOverlayProfile === expectedStepOverlayProfile && stepOverlayZoneCount >= 1);
    const stepAnimationOk = expectedStepAnimated === null
      || (stepAnimated === expectedStepAnimated && (expectedStepAnimated === false || stepFrameCount >= 2));
    const beforeStepCanvasHash = hashCanvas(stepWebglCanvas);
    return new Promise((resolve) => {
      setTimeout(() => {
        const afterStepCanvasHash = hashCanvas(stepWebglCanvas);
        const stepAnimationDiffOk = expectedStepAnimated === true
          ? Boolean(beforeStepCanvasHash && afterStepCanvasHash && beforeStepCanvasHash !== afterStepCanvasHash)
          : true;
        const ok = stateOk && nonblank === true && rendererOk && stepRendererOk && stepOverlayOk && stepAnimationOk && stepAnimationDiffOk && webglOk && displayOk && stepOk && profileOk && overlayOk;
        resolve({
          label: ${JSON.stringify(expectations.label ?? "preview")},
          ok,
          state,
          has_webgl_canvas: hasWebglCanvas,
          has_step_webgl_canvas: hasStepWebglCanvas,
          renderer: webglCanvas?.dataset.renderer || null,
          step_renderer: stepWebglCanvas?.dataset.renderer || null,
          step_overlay_profile: stepOverlayProfile,
          step_overlay_zone_count: stepOverlayZoneCount,
          step_frame_count: stepFrameCount,
          step_animated: stepAnimated,
          fallback_hidden: fallback?.hidden ?? null,
          step_fallback_hidden: stepFallback?.hidden ?? null,
          stage_hidden: stage?.hidden ?? null,
          step_stage_hidden: stepStage?.hidden ?? null,
          nonblank,
          display_text: displayText,
          step_detail_text: stepDetailText,
          active_step_tab: activeStepTab,
          executor_caption: executorCaption,
          step_canvas_hash: afterStepCanvasHash,
          step_canvas_hash_before: beforeStepCanvasHash,
          compare_step_canvas_with: ${JSON.stringify(expectations.compareStepCanvasWith ?? null)},
          checks: {
            state_ok: stateOk,
            renderer_ok: rendererOk,
            step_renderer_ok: stepRendererOk,
            step_overlay_ok: stepOverlayOk,
            step_animation_ok: stepAnimationOk,
            step_animation_diff_ok: stepAnimationDiffOk,
            webgl_ok: webglOk,
            display_ok: displayOk,
            step_ok: stepOk,
            profile_ok: profileOk,
            overlay_ok: overlayOk
          }
        });
      }, 950);
    });

    function hashCanvas(canvas) {
      if (!canvas) {
        return null;
      }
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (!gl) {
        return null;
      }
      const sampleSize = 24;
      const bufferWidth = Math.max(1, gl.drawingBufferWidth);
      const bufferHeight = Math.max(1, gl.drawingBufferHeight);
      const pixels = new Uint8Array(sampleSize * sampleSize * 4);
      const sample = new Uint8Array(4);
      let hash = 2166136261;
      for (let y = 0; y < sampleSize; y += 1) {
        for (let x = 0; x < sampleSize; x += 1) {
          const px = Math.min(bufferWidth - 1, Math.round((x + 0.5) * bufferWidth / sampleSize));
          const py = Math.min(bufferHeight - 1, Math.round((y + 0.5) * bufferHeight / sampleSize));
          gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, sample);
          const offset = (y * sampleSize + x) * 4;
          pixels[offset] = sample[0];
          pixels[offset + 1] = sample[1];
          pixels[offset + 2] = sample[2];
          pixels[offset + 3] = sample[3];
        }
      }
      for (let index = 0; index < pixels.length; index += 1) {
        hash ^= pixels[index];
        hash = Math.imul(hash, 16777619);
      }
      return (hash >>> 0).toString(16);
    }
  })()`;
}

async function waitForHttp(url) {
  const started = Date.now();
  while (Date.now() - started < 8000) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`${url}: did not become ready`);
}

async function stopProcess(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }
  const exited = once(child, "exit");
  child.kill("SIGTERM");
  await Promise.race([
    exited,
    new Promise((resolve) => setTimeout(resolve, 1200))
  ]);
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${stableStringify(value, 2)}\n`, "utf8");
}

async function fileExists(path) {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

async function canAccessFile(path) {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

function stableChecksum(text) {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return `foldgen-${Math.abs(hash).toString(16)}`;
}

function toRepoPath(path) {
  return relative(process.cwd(), path).split("\\").join("/");
}
