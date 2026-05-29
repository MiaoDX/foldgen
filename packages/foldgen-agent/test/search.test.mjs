import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import assert from "node:assert/strict";

import { parseFold, validateExecutorReadableStep, validateFold } from "../../fold-core/src/index.mjs";
import { runLocalSearchBatch, searchOperationSequence, stage1ExecutorProfiles, targetProfiles } from "../src/index.mjs";

const execFileAsync = promisify(execFile);

test("local search sequence records iterations and selected operations", async () => {
  const baseFold = parseFold(await readFile("benchmarks/base-forms/bird-base.fold", "utf8"));
  const result = searchOperationSequence(baseFold, targetProfiles["simple-bird.svg"], {
    maxIterations: 2,
    beamWidth: 3
  });

  assert.equal(result.status, "complete");
  assert.equal(result.operations.length, 2);
  const profileOperationIds = new Set(targetProfiles["simple-bird.svg"].candidates.flatMap((candidate) => (
    candidate.operations ?? [candidate.operation]
  )).filter(Boolean).map((operation) => operation.id));
  assert.equal(result.operations.every((operation) => profileOperationIds.has(operation.id)), true);
  assert.equal(new Set(result.operations.map((operation) => operation.id)).size, 2);
  assert.equal(validateFold(result.derived).ok, true);
  assert.equal(result.derived.foldgen_history.length, 2);
  assert.equal(result.history.iterations.length, 2);
  for (const iteration of result.history.iterations) {
    assert.equal(iteration.status, "selected");
    assert.ok(iteration.proposals.length > 0);
    assert.equal(iteration.proposals.filter((proposal) => proposal.selected).length, 1);
    assert.ok(iteration.proposals.every((proposal) => proposal.render_summary.type === "foldgen.preview.v1"));
    assert.ok(iteration.proposals.every((proposal) => proposal.critic_result.evaluator === "deterministic-critic-v0"));
    assert.ok(iteration.proposals.every((proposal) => Array.isArray(proposal.critic_result.reasons)));
    assert.ok(iteration.proposals.every((proposal) => typeof proposal.score === "number"));
  }
});

test("local search batch writes five valid cases with profile sequences", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "foldgen-m7-"));
  try {
    const summary = await runLocalSearchBatch({ outDir });
    assert.equal(summary.ok, true);
    assert.equal(summary.case_count, 5);

    for (const searchCase of summary.cases) {
      assert.equal(searchCase.status, "valid");
      assert.equal(searchCase.search_status, "complete");
      assert.equal(searchCase.executor_readable, true);
      assert.equal(searchCase.selected_operation_count, 2);
      assert.equal(searchCase.iteration_count, 2);
      assert.deepEqual(searchCase.executor_profiles, stage1ExecutorProfiles);

      const caseDir = join(outDir, searchCase.case_id);
      const derived = parseFold(await readFile(join(caseDir, "derived.fold"), "utf8"));
      assert.equal(validateFold(derived).ok, true);
      assert.equal(derived.foldgen_history.length, 2);

      const history = JSON.parse(await readFile(join(caseDir, "search-history.json"), "utf8"));
      assert.equal(history.type, "foldgen.local_search_history.v1");
      assert.equal(history.iterations.length, 2);
      assert.ok(history.iterations.every((iteration) => iteration.proposals.some((proposal) => proposal.selected)));
      assert.ok(history.iterations.every((iteration) => iteration.proposals.every((proposal) => proposal.validation_status)));
      assert.ok(history.iterations.every((iteration) => iteration.proposals.every((proposal) => proposal.render_summary.edge_count > 0)));
      const animation = JSON.parse(await readFile(join(caseDir, "preview-animation.json"), "utf8"));
      assert.equal(animation.type, "foldgen.preview_animation.v1");
      assert.equal(animation.operation_count, searchCase.selected_operation_count);

      const sequence = JSON.parse(await readFile(join(caseDir, "diagram-sequence.json"), "utf8"));
      assert.equal(sequence.step_count, 2);
      assert.equal(sequence.steps.every((step) => validateExecutorReadableStep(step).ok), true);
      for (const executorProfile of stage1ExecutorProfiles) {
        const profileSequence = JSON.parse(await readFile(join(caseDir, `diagram-sequence-${executorProfile}.json`), "utf8"));
        assert.equal(profileSequence.executor_profile, executorProfile);
        assert.equal(profileSequence.step_count, 2);
        assert.equal(profileSequence.steps.every((step) => step.executor_profile === executorProfile), true);
        assert.equal(profileSequence.steps.every((step) => validateExecutorReadableStep(step).ok), true);
      }
    }
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test("local search CLI writes a five-case summary", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "foldgen-m7-cli-"));
  try {
    const { stdout } = await execFileAsync("node", ["packages/foldgen-agent/bin/run-search.mjs", outDir]);
    const summary = JSON.parse(stdout);
    assert.equal(summary.ok, true);
    assert.equal(summary.case_count, 5);
    assert.equal(summary.strategy, "deterministic-local-search-v0");
    assert.equal(summary.cases.length, 5);
    assert.ok(summary.cases.every((searchCase) => searchCase.search_status === "complete"));
    assert.ok(summary.cases.every((searchCase) => searchCase.selected_operation_count === 2));
    assert.ok(summary.cases.every((searchCase) => searchCase.iteration_count === 2));
    assert.ok(summary.cases.every((searchCase) => searchCase.executor_readable === true));
    assert.ok(summary.cases.every((searchCase) => stage1ExecutorProfiles.every((executorProfile) => searchCase.executor_profiles.includes(executorProfile))));
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});
