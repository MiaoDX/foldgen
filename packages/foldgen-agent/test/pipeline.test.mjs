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

test("curated M2 pipeline writes five valid selected cases with history", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "foldgen-m2-"));
  try {
    const summary = await runCuratedPipeline({ outDir });
    assert.equal(summary.ok, true);
    assert.equal(summary.case_count, 5);

    for (const pipelineCase of summary.cases) {
      assert.equal(pipelineCase.status, "valid");
      assert.equal(pipelineCase.validation_status, true);
      assert.deepEqual(pipelineCase.claim_status, {
        claim_label: "simulator-valid / executor-readable / embodiment-untested",
        simulator_valid: true,
        executor_readable: true,
        embodiment_validated: false,
        embodiment_status: "untested",
        final_record_path: null
      });
      assert.equal(pipelineCase.external_validation.community_fold.status, "passed");
      assert.equal(pipelineCase.external_validation.flat_folder.status, "failed");
      assert.equal(pipelineCase.external_validation.community_preview.status, "passed");
      assert.equal(pipelineCase.executor_readable, true);
      assert.equal(pipelineCase.executor_profile, "human-hand");
      assert.deepEqual(pipelineCase.executor_profiles, stage1ExecutorProfiles);
      assert.ok(pipelineCase.selected_base_form.endsWith("-base.fold"));
      assert.ok(pipelineCase.artifact_paths.derived_fold);
      assert.ok(pipelineCase.artifact_paths.crease_svg);
      assert.ok(pipelineCase.artifact_paths.preview);
      assert.ok(pipelineCase.artifact_paths.preview_animation);
      assert.ok(pipelineCase.artifact_paths.community_fold_validation);
      assert.ok(pipelineCase.artifact_paths.flat_folder_validation);
      assert.ok(pipelineCase.artifact_paths.origami_simulator_fold);
      assert.ok(pipelineCase.artifact_paths.origami_simulator_preview);
      assert.ok(pipelineCase.artifact_paths.fold_program_ir);
      assert.ok(pipelineCase.artifact_paths.visual_walkthrough);
      assert.ok(pipelineCase.artifact_paths.diagram_sequence);
      assert.equal(pipelineCase.fold_program_ir_status, "thin-ir");
      assert.match(pipelineCase.visual_walkthrough_status, /^walkthrough-/);
      assert.ok(pipelineCase.artifact_paths.proposal_history);
      assert.ok(pipelineCase.artifact_paths.critic_history);
      assert.ok(pipelineCase.rejected_candidate_count > 0);
      assert.equal(pipelineCase.selected_operation_count > 1, true);

      const caseDir = join(outDir, pipelineCase.case_id);
      const derived = parseFold(await readFile(join(caseDir, "derived.fold"), "utf8"));
      assert.equal(validateFold(derived).ok, true);
      assert.equal(derived.foldgen_history.length, pipelineCase.selected_operation_count);
      assert.match(await readFile(join(caseDir, "crease.svg"), "utf8"), /<svg/);

      const proposalHistory = JSON.parse(await readFile(join(caseDir, "proposal-history.json"), "utf8"));
      assert.ok(proposalHistory.candidates.some((candidate) => candidate.selected));
      assert.ok(proposalHistory.candidates.some((candidate) => candidate.validation_status === "invalid"));
      assert.ok(proposalHistory.candidates.some((candidate) => candidate.operations.length > 1));

      const criticHistory = JSON.parse(await readFile(join(caseDir, "critic-history.json"), "utf8"));
      assert.ok(criticHistory.entries.some((entry) => entry.verdict === "rejected-invalid"));

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
        assert.equal(profileSequence.executor_visual_metadata.instruction_label, "template executor instructions");
        assert.ok(profileSequence.executor_visual_metadata.contact_zones.length > 0);
        assert.equal(profileSequence.steps.length, pipelineCase.selected_operation_count);
        assert.equal(profileSequence.steps.every((step) => step.executor_profile === executorProfile), true);
        assert.equal(profileSequence.steps.every((step) => validateExecutorReadableStep(step).ok), true);
        assert.equal(pipelineCase.artifact_paths.diagram_sequences[executorProfile].endsWith(`diagram-sequence-${executorProfile}.json`), true);
      }

      const caseSummary = JSON.parse(await readFile(join(caseDir, "summary.json"), "utf8"));
      assert.equal(caseSummary.selected_candidate_id, pipelineCase.selected_candidate_id);
      const communityFoldValidation = JSON.parse(await readFile(join(caseDir, "community-fold-validation.json"), "utf8"));
      assert.equal(communityFoldValidation.status, "passed");
      const flatFolderValidation = JSON.parse(await readFile(join(caseDir, "flat-folder-validation.json"), "utf8"));
      assert.equal(flatFolderValidation.status, "failed");
      const simulatorPreview = JSON.parse(await readFile(join(caseDir, "origami-simulator-preview.json"), "utf8"));
      assert.equal(simulatorPreview.status, "passed");
      assert.match(await readFile(join(caseDir, "origami-simulator.fold"), "utf8"), /edges_foldAngle/);
      const foldProgramIr = JSON.parse(await readFile(join(caseDir, "fold-program-ir.json"), "utf8"));
      assert.equal(foldProgramIr.type, "foldgen.fold_program_ir.v1");
      assert.equal(foldProgramIr.operations.length, pipelineCase.selected_operation_count);
      assert.equal(foldProgramIr.dsl_policy.textual_dsl_status, "deferred");
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
    assert.equal(writtenSummary.case_count, 5);
    assert.equal(writtenSummary.claim_status.claim_label, "simulator-valid / executor-readable / embodiment-untested");
    assert.equal(writtenSummary.claim_status.executor_readable, true);
    assert.ok(writtenSummary.cases.every((pipelineCase) => pipelineCase.external_validation.community_fold.status === "passed"));
    assert.ok(writtenSummary.cases.every((pipelineCase) => pipelineCase.external_validation.flat_folder.status === "failed"));
    assert.ok(writtenSummary.cases.every((pipelineCase) => pipelineCase.external_validation.community_preview.status === "passed"));
    assert.ok(writtenSummary.cases.every((pipelineCase) => (
      stage1ExecutorProfiles.every((executorProfile) => pipelineCase.executor_profiles.includes(executorProfile))
    )));
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test("M2 pipeline CLI writes a five-case summary", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "foldgen-m2-cli-"));
  try {
    const { stdout } = await execFileAsync("node", ["packages/foldgen-agent/bin/run-pipeline.mjs", outDir]);
    const summary = JSON.parse(stdout);
    assert.equal(summary.ok, true);
    assert.equal(summary.case_count, 5);
    assert.equal(summary.cases.length, 5);
    assert.ok(summary.cases.every((pipelineCase) => pipelineCase.status === "valid"));
    assert.ok(summary.cases.every((pipelineCase) => pipelineCase.selected_operation_count > 1));
    assert.ok(summary.cases.every((pipelineCase) => pipelineCase.claim_status.claim_label === "simulator-valid / executor-readable / embodiment-untested"));
    assert.ok(summary.cases.every((pipelineCase) => pipelineCase.executor_readable === true));
    assert.ok(summary.cases.every((pipelineCase) => stage1ExecutorProfiles.every((executorProfile) => pipelineCase.executor_profiles.includes(executorProfile))));
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});
