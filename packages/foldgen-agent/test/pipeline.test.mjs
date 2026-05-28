import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import assert from "node:assert/strict";

import { parseFold, validateFold } from "../../fold-core/src/index.mjs";
import { runCuratedPipeline } from "../src/index.mjs";

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
      assert.ok(pipelineCase.selected_base_form.endsWith("-base.fold"));
      assert.ok(pipelineCase.artifact_paths.derived_fold);
      assert.ok(pipelineCase.artifact_paths.crease_svg);
      assert.ok(pipelineCase.artifact_paths.preview);
      assert.ok(pipelineCase.artifact_paths.proposal_history);
      assert.ok(pipelineCase.artifact_paths.critic_history);
      assert.ok(pipelineCase.rejected_candidate_count > 0);

      const caseDir = join(outDir, pipelineCase.case_id);
      const derived = parseFold(await readFile(join(caseDir, "derived.fold"), "utf8"));
      assert.equal(validateFold(derived).ok, true);
      assert.match(await readFile(join(caseDir, "crease.svg"), "utf8"), /<svg/);

      const proposalHistory = JSON.parse(await readFile(join(caseDir, "proposal-history.json"), "utf8"));
      assert.ok(proposalHistory.candidates.some((candidate) => candidate.selected));
      assert.ok(proposalHistory.candidates.some((candidate) => candidate.validation_status === "invalid"));

      const criticHistory = JSON.parse(await readFile(join(caseDir, "critic-history.json"), "utf8"));
      assert.ok(criticHistory.entries.some((entry) => entry.verdict === "rejected-invalid"));

      const preview = JSON.parse(await readFile(join(caseDir, "preview.json"), "utf8"));
      assert.equal(preview.type, "foldgen.preview.v1");
      assert.ok(preview.vertices.length > 0);

      const caseSummary = JSON.parse(await readFile(join(caseDir, "summary.json"), "utf8"));
      assert.equal(caseSummary.selected_candidate_id, pipelineCase.selected_candidate_id);
    }

    const writtenSummary = JSON.parse(await readFile(join(outDir, "summary.json"), "utf8"));
    assert.equal(writtenSummary.ok, true);
    assert.equal(writtenSummary.case_count, 5);
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
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});
