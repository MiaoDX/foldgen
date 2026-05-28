import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import assert from "node:assert/strict";

import { createPreviewModel, parseFold, validateFold } from "../../fold-core/src/index.mjs";
import {
  evaluateCandidate,
  runCriticBatch,
  stage1ExecutorProfiles,
  summarizePreview,
  targetProfiles
} from "../src/index.mjs";

const execFileAsync = promisify(execFile);

test("critic v0 ranks valid candidates and explains score components", async () => {
  const baseFold = parseFold(await readFile("benchmarks/base-forms/fish-base.fold", "utf8"));
  const operation = targetProfiles["simple-fish.svg"].candidates[0].operations[0];
  const validation = validateFold(baseFold);
  const renderSummary = summarizePreview(createPreviewModel(baseFold));

  const result = evaluateCandidate({
    operation,
    validation,
    renderSummary,
    targetFeatures: targetProfiles["simple-fish.svg"].targetFeatures,
    priorScore: 1,
    rank: 1
  });

  assert.equal(result.evaluator, "deterministic-critic-v0");
  assert.equal(result.verdict, "ranked-valid");
  assert.equal(result.score > 1, true);
  assert.equal(result.score_components.validity, 1);
  assert.ok(result.feature_matches.includes("tail"));
  assert.ok(result.reasons.some((reason) => reason.includes("passed structural validation")));
});

test("critic v0 rejects invalid candidates with validation reasons", () => {
  const result = evaluateCandidate({
    operation: {
      id: "invalid",
      name: "Invalid fold",
      assignment: "V",
      edge: [0, 99]
    },
    validation: {
      ok: false,
      errors: ["edges_vertices[0] references an out-of-range vertex"],
      warnings: []
    },
    renderSummary: {
      non_boundary_edge_count: 0
    },
    targetFeatures: ["tail"],
    priorScore: 3,
    rank: 1
  });

  assert.equal(result.verdict, "rejected-invalid");
  assert.equal(result.score, 0);
  assert.equal(result.score_components.validity, 0);
  assert.deepEqual(result.feature_matches, []);
  assert.match(result.reasons.join("\n"), /out-of-range/);
});

test("critic batch writes ranked histories for five cases", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "foldgen-m8-"));
  try {
    const summary = await runCriticBatch({ outDir });
    assert.equal(summary.ok, true);
    assert.equal(summary.case_count, 5);

    for (const criticCase of summary.cases) {
      assert.equal(criticCase.status, "ranked");
      assert.ok(criticCase.selected_candidate_id);
      assert.equal(criticCase.rejected_candidate_count > 0, true);
      assert.deepEqual(criticCase.executor_profiles, stage1ExecutorProfiles);

      const history = JSON.parse(await readFile(join(outDir, criticCase.case_id, "critic-history.json"), "utf8"));
      assert.equal(history.type, "foldgen.critic_history.v1");
      assert.equal(history.evaluator, "deterministic-critic-v0");
      assert.equal(history.entries.filter((entry) => entry.selected).length, 1);
      assert.ok(history.entries.some((entry) => entry.verdict === "rejected-invalid"));
      assert.ok(history.entries.every((entry) => Array.isArray(entry.reasons) && entry.reasons.length > 0));
      assert.ok(history.entries.every((entry) => typeof entry.score === "number"));
    }
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test("critic CLI writes a five-case summary", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "foldgen-m8-cli-"));
  try {
    const { stdout } = await execFileAsync("node", ["packages/foldgen-agent/bin/run-critic.mjs", outDir]);
    const summary = JSON.parse(stdout);
    assert.equal(summary.ok, true);
    assert.equal(summary.case_count, 5);
    assert.equal(summary.evaluator, "deterministic-critic-v0");
    assert.equal(summary.cases.length, 5);
    assert.ok(summary.cases.every((criticCase) => criticCase.status === "ranked"));
    assert.ok(summary.cases.every((criticCase) => criticCase.rejected_candidate_count > 0));
    assert.ok(summary.cases.every((criticCase) => stage1ExecutorProfiles.every((executorProfile) => criticCase.executor_profiles.includes(executorProfile))));
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});
