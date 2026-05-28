import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import assert from "node:assert/strict";

import { parseFold, validateExecutorReadableStep, validateFold } from "../../fold-core/src/index.mjs";
import {
  analyzeReferenceImage,
  runImageToFold,
  selectProfileForImage,
  stage1ExecutorProfiles
} from "../src/index.mjs";

const execFileAsync = promisify(execFile);
const targetMetadata = JSON.parse(await readFile("benchmarks/targets/metadata.json", "utf8"));

test("reference SVG analysis extracts image tokens and shape counts", async () => {
  const analysis = await analyzeReferenceImage("benchmarks/targets/simple-boat.svg");

  assert.equal(analysis.type, "foldgen.reference_image_analysis.v1");
  assert.equal(analysis.media_type, "image/svg+xml");
  assert.ok(analysis.feature_tokens.includes("boat"));
  assert.ok(analysis.tokens.includes("simple-boat"));
  assert.equal(analysis.shape_counts.path >= 3, true);
  assert.ok(analysis.text_hints.some((hint) => hint.includes("boat")));
});

test("image profile selection routes distinct references to distinct base forms", async () => {
  const birdAnalysis = await analyzeReferenceImage("benchmarks/targets/simple-bird.svg");
  const birdSelection = selectProfileForImage(birdAnalysis, targetMetadata.targets);
  assert.equal(birdSelection.profile.caseId, "simple-bird");
  assert.equal(birdSelection.profile.baseForm, "bird-base.fold");
  assert.ok(birdSelection.reasons.length > 0);

  const boatAnalysis = await analyzeReferenceImage("benchmarks/targets/simple-boat.svg");
  const boatSelection = selectProfileForImage(boatAnalysis, targetMetadata.targets);
  assert.equal(boatSelection.profile.caseId, "simple-boat");
  assert.equal(boatSelection.profile.baseForm, "kite-base.fold");
  assert.ok(boatSelection.rankedCandidates[0].score > boatSelection.rankedCandidates.at(-1).score);
});

test("image-to-fold writes search artifacts and executor profile sequences", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "foldgen-m9-"));
  try {
    const summary = await runImageToFold({
      referencePath: "benchmarks/targets/simple-fish.svg",
      outDir
    });
    assert.equal(summary.ok, true);
    assert.equal(summary.selection.selected_case_id, "simple-fish");
    assert.equal(summary.selection.selected_base_form, "fish-base.fold");
    assert.equal(summary.search_case.status, "valid");
    assert.equal(summary.search_case.executor_readable, true);
    assert.equal(summary.search_case.selected_operation_count, 2);
    assert.deepEqual(summary.search_case.executor_profiles, stage1ExecutorProfiles);

    const writtenSummary = JSON.parse(await readFile(join(outDir, "summary.json"), "utf8"));
    assert.equal(writtenSummary.selection.selected_case_id, "simple-fish");
    const selection = JSON.parse(await readFile(join(outDir, "selection.json"), "utf8"));
    assert.equal(selection.selected_base_form, "fish-base.fold");
    const analysis = JSON.parse(await readFile(join(outDir, "image-analysis.json"), "utf8"));
    assert.ok(analysis.feature_tokens.includes("fish"));

    const caseDir = join(outDir, "simple-fish");
    const derived = parseFold(await readFile(join(caseDir, "derived.fold"), "utf8"));
    assert.equal(validateFold(derived).ok, true);
    const searchHistory = JSON.parse(await readFile(join(caseDir, "search-history.json"), "utf8"));
    assert.equal(searchHistory.iterations.length, 2);
    const dogSequence = JSON.parse(await readFile(join(caseDir, "diagram-sequence-dog-paw-profile.json"), "utf8"));
    assert.equal(dogSequence.executor_profile, "dog-paw-profile");
    assert.equal(dogSequence.steps.every((step) => validateExecutorReadableStep(step).ok), true);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test("image-to-fold CLI routes a reference image", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "foldgen-m9-cli-"));
  try {
    const { stdout } = await execFileAsync("node", [
      "packages/foldgen-agent/bin/run-image-to-fold.mjs",
      "benchmarks/targets/simple-bird.svg",
      outDir
    ]);
    const summary = JSON.parse(stdout);
    assert.equal(summary.ok, true);
    assert.equal(summary.selected_case_id, "simple-bird");
    assert.equal(summary.selected_base_form, "bird-base.fold");
    assert.equal(summary.search_status, "complete");
    assert.equal(summary.selected_operation_count, 2);
    assert.equal(summary.executor_readable, true);
    assert.ok(stage1ExecutorProfiles.every((executorProfile) => summary.executor_profiles.includes(executorProfile)));
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});
