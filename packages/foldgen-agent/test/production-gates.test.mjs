import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
  runArtifactGraphGate,
  runBackendStateRouterGate,
  runCandidateGraduationGate,
  runGeneratedCandidateHarnessGate,
  runGeneratedExecutorFeasibilityGate,
  runGeneratedPreviewReviewGate,
  runGeneratedStepReplayGate,
  runGeneratedTargetScorerGate,
  runOriginalGapClosureAuditGate,
  runProgressiveStateBackendGate,
  runRecognizableKnownGoodGate,
  runThreeStepWalkthroughGate
} from "../src/index.mjs";

test("production artifact graph gate blocks incomplete graphs and promotes completed-usable cases", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "foldgen-m24-"));
  try {
    const result = await runArtifactGraphGate({ outDir });
    assert.equal(result.ok, true, result.errors.join("\n"));
    assert.equal(result.completed_usable_case_count, 4);
    assert.equal(result.completed_usable_generated_case_count, 1);
    assert.equal(result.incomplete_graph_fixture.status, "blocked-as-expected");
    assert.ok(result.incomplete_graph_fixture.missing_required_artifacts.includes("source_provenance"));
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test("recognizable known-good gate promotes paper hat while keeping boat blocked", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "foldgen-m25-"));
  try {
    const result = await runRecognizableKnownGoodGate({ outDir });
    assert.equal(result.ok, true, result.errors.join("\n"));
    assert.equal(result.recognizable_completed_case_count, 2);
    assert.equal(result.recognizable_completed_cases[0].case_id, "known-good-paper-hat");
    assert.equal(result.boat.display_mode, "blocked-solver");
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test("progressive state backend gate records manual import route while simulator automation is blocked", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "foldgen-m26-"));
  try {
    const result = await runProgressiveStateBackendGate({ outDir });
    assert.equal(result.ok, true, result.errors.join("\n"));
    assert.equal(result.completed_case_id, "known-good-square-packet");
    assert.equal(result.completed_case_step_count, 2);
    assert.equal(result.validated_import_count >= 2, true);
    assert.equal(result.origami_simulator_adapter.status, "blocked-automated-state-export");
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test("three step walkthrough and candidate graduation gates enforce completed evidence", async () => {
  const walkthroughDir = await mkdtemp(join(tmpdir(), "foldgen-m27-"));
  const graduationDir = await mkdtemp(join(tmpdir(), "foldgen-m28-"));
  try {
    const walkthrough = await runThreeStepWalkthroughGate({ outDir: walkthroughDir });
    assert.equal(walkthrough.ok, true, walkthrough.errors.join("\n"));
    assert.equal(walkthrough.completed_usable_case_count, 4);
    assert.equal(walkthrough.completed_usable_generated_case_count, 1);
    assert.ok(walkthrough.cases.find((entry) => entry.case_id === "known-good-square-packet" && entry.step_count === 2 && entry.selected_step_invariant === "passed"));

    const graduation = await runCandidateGraduationGate({ outDir: graduationDir });
    assert.equal(graduation.ok, true, graduation.errors.join("\n"));
    assert.equal(graduation.completed_usable_candidate_count, 5);
    assert.equal(graduation.completed_usable_generated_candidate_count, 1);
    assert.equal(graduation.wrong_target_fixture.status, "blocked-target-match");
  } finally {
    await rm(walkthroughDir, { recursive: true, force: true });
    await rm(graduationDir, { recursive: true, force: true });
  }
});

test("generated usable graduation gates prove recipe, backend, target, step, and executor evidence", async () => {
  const harnessDir = await mkdtemp(join(tmpdir(), "foldgen-m30-"));
  const backendDir = await mkdtemp(join(tmpdir(), "foldgen-m31-"));
  const targetDir = await mkdtemp(join(tmpdir(), "foldgen-m32-"));
  const stepDir = await mkdtemp(join(tmpdir(), "foldgen-m33-"));
  const executorDir = await mkdtemp(join(tmpdir(), "foldgen-m34-"));
  try {
    const harness = await runGeneratedCandidateHarnessGate({ outDir: harnessDir });
    assert.equal(harness.ok, true, harness.errors.join("\n"));
    assert.equal(harness.display_mode, "completed-usable-generated");
    assert.ok(harness.candidate_recipe_path);
    assert.ok(harness.candidate_run_path);

    const backend = await runBackendStateRouterGate({ outDir: backendDir });
    assert.equal(backend.ok, true, backend.errors.join("\n"));
    assert.equal(backend.backend_state_status, "passed");
    assert.equal(backend.boat.display_mode, "blocked-solver");

    const target = await runGeneratedTargetScorerGate({ outDir: targetDir });
    assert.equal(target.ok, true, target.errors.join("\n"));
    assert.equal(target.target_match.status, "passed");
    assert.equal(target.wrong_target_fixture.status, "rejected-target-match");

    const step = await runGeneratedStepReplayGate({ outDir: stepDir });
    assert.equal(step.ok, true, step.errors.join("\n"));
    assert.equal(step.step_count, 1);
    assert.equal(step.solver_backed_step_count, 1);

    const executor = await runGeneratedExecutorFeasibilityGate({ outDir: executorDir });
    assert.equal(executor.ok, true, executor.errors.join("\n"));
    assert.equal(executor.overlay_status, "complete");
    assert.equal(executor.cat_paw_status, "precision-actions-blocked-or-fixture-needed");
  } finally {
    await rm(harnessDir, { recursive: true, force: true });
    await rm(backendDir, { recursive: true, force: true });
    await rm(targetDir, { recursive: true, force: true });
    await rm(stepDir, { recursive: true, force: true });
    await rm(executorDir, { recursive: true, force: true });
  }
});

test("generated preview and original gap closure gates prove the user-visible gaps", async () => {
  const previewDir = await mkdtemp(join(tmpdir(), "foldgen-m35-"));
  const auditDir = await mkdtemp(join(tmpdir(), "foldgen-m36-"));
  const previewQaDir = await mkdtemp(join(tmpdir(), "foldgen-m35-qa-"));
  const auditQaDir = await mkdtemp(join(tmpdir(), "foldgen-m36-qa-"));
  try {
    const preview = await runGeneratedPreviewReviewGate({
      outDir: previewDir,
      qaDir: previewQaDir,
      port: 4285,
      chromePort: 9335
    });
    assert.equal(preview.ok, true, preview.errors.join("\n"));
    assert.equal(preview.generated_cases.length, 2);
    assert.equal(preview.generated_cases.every((entry) => entry.has_webgl_canvas === true), true);
    assert.equal(preview.generated_cases.every((entry) => entry.step_animated === true), true);
    assert.equal(preview.boat.state, "Partial");

    const audit = await runOriginalGapClosureAuditGate({
      outDir: auditDir,
      qaDir: auditQaDir,
      port: 4286,
      chromePort: 9336
    });
    assert.equal(audit.ok, true, audit.errors.join("\n"));
    assert.equal(audit.requirement_count, 11);
    assert.equal(audit.evidence.every((entry) => entry.status === "passed"), true);
    assert.ok(audit.evidence.find((entry) => entry.requirement === "specific step selection preserves clicked step number and content"));
    assert.ok(audit.evidence.find((entry) => entry.requirement === "decorative dashed helper lines are absent from step SVGs"));
    assert.ok(audit.evidence.find((entry) => entry.requirement === "boat cannot render as completed while solver evidence fails"));
  } finally {
    await rm(previewDir, { recursive: true, force: true });
    await rm(auditDir, { recursive: true, force: true });
    await rm(previewQaDir, { recursive: true, force: true });
    await rm(auditQaDir, { recursive: true, force: true });
  }
});
