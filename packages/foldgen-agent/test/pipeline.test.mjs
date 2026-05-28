import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import assert from "node:assert/strict";

import { parseFold, validateExecutorReadableStep, validateFold } from "../../fold-core/src/index.mjs";
import { runCuratedPipeline, stage1ExecutorProfiles } from "../src/index.mjs";

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
      assert.equal(pipelineCase.executor_readable, true);
      assert.equal(pipelineCase.executor_profile, "human-hand");
      assert.deepEqual(pipelineCase.executor_profiles, stage1ExecutorProfiles);
      assert.ok(pipelineCase.selected_base_form.endsWith("-base.fold"));
      assert.ok(pipelineCase.artifact_paths.derived_fold);
      assert.ok(pipelineCase.artifact_paths.crease_svg);
      assert.ok(pipelineCase.artifact_paths.preview);
      assert.ok(pipelineCase.artifact_paths.preview_animation);
      assert.ok(pipelineCase.artifact_paths.diagram_sequence);
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
        assert.equal(profileSequence.steps.length, pipelineCase.selected_operation_count);
        assert.equal(profileSequence.steps.every((step) => step.executor_profile === executorProfile), true);
        assert.equal(profileSequence.steps.every((step) => validateExecutorReadableStep(step).ok), true);
        assert.equal(pipelineCase.artifact_paths.diagram_sequences[executorProfile].endsWith(`diagram-sequence-${executorProfile}.json`), true);
      }

      const caseSummary = JSON.parse(await readFile(join(caseDir, "summary.json"), "utf8"));
      assert.equal(caseSummary.selected_candidate_id, pipelineCase.selected_candidate_id);
    }

    const writtenSummary = JSON.parse(await readFile(join(outDir, "summary.json"), "utf8"));
    assert.equal(writtenSummary.ok, true);
    assert.equal(writtenSummary.case_count, 5);
    assert.equal(writtenSummary.claim_status.claim_label, "simulator-valid / executor-readable / embodiment-untested");
    assert.equal(writtenSummary.claim_status.executor_readable, true);
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
