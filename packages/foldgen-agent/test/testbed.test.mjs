import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import assert from "node:assert/strict";

import {
  analyzeReferenceImage,
  createSourceProvenance,
  runExpandedTestbed,
  runKnownGoodTutorialFixtureGate,
  selectProfileForImage
} from "../src/index.mjs";

const execFileAsync = promisify(execFile);

test("expanded target metadata includes public and known-good cases", async () => {
  const metadata = JSON.parse(await readFile("benchmarks/targets/metadata.json", "utf8"));
  assert.equal(metadata.targets.length, 15);
  assert.equal(metadata.targets.filter((target) => String(target.usage).includes("creative/reference")).length, 5);
  assert.equal(metadata.targets.filter((target) => String(target.usage).includes("known-good")).length, 4);
  assert.equal(metadata.targets.filter((target) => String(target.usage).includes("generated usable graduation")).length, 1);
  assert.ok(metadata.targets.every((target) => target.license === "CC0-1.0"));
});

test("creative reference cases route through profile hints", async () => {
  const metadata = JSON.parse(await readFile("benchmarks/targets/metadata.json", "utf8"));
  const analysis = await analyzeReferenceImage("benchmarks/targets/creative-sailboat.svg");
  const selection = selectProfileForImage(analysis, metadata.targets);

  assert.equal(selection.target.file, "creative-sailboat.svg");
  assert.equal(selection.profile.caseId, "simple-boat");
  assert.equal(selection.profile.baseForm, "kite-base.fold");
  assert.ok(selection.reasons.some((reason) => reason.includes("profile_hint")));
});

test("expanded testbed batch runs image-to-fold for all targets", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "foldgen-m10-"));
  try {
    const summary = await runExpandedTestbed({ outDir });
    assert.equal(summary.ok, true);
    assert.equal(summary.target_count, 15);
    assert.equal(summary.creative_reference_count, 5);
    assert.equal(summary.cases.length, 15);
    assert.ok(summary.cases.every((testbedCase) => testbedCase.executor_readable === true));
    assert.ok(summary.cases.every((testbedCase) => testbedCase.selected_operation_count >= 1));
    assert.ok(summary.cases.some((testbedCase) => testbedCase.target_file === "known-good-triangle.svg" && testbedCase.selected_operation_count === 1));
    assert.ok(summary.cases.some((testbedCase) => testbedCase.target_file === "generated-triangle.svg" && testbedCase.selected_case_id === "generated-triangle" && testbedCase.selected_operation_count >= 1));
    assert.ok(summary.cases.some((testbedCase) => testbedCase.target_file === "known-good-paper-hat.svg" && testbedCase.selected_operation_count === 1));
    assert.ok(summary.cases.some((testbedCase) => testbedCase.target_file === "known-good-square-packet.svg" && testbedCase.selected_operation_count === 2));
    assert.ok(summary.cases.some((testbedCase) => testbedCase.target_file === "creative-crane.svg" && testbedCase.selected_case_id === "simple-bird"));
    assert.ok(summary.cases.some((testbedCase) => testbedCase.target_file === "creative-sunstar.svg" && testbedCase.selected_case_id === "simple-star"));

    const writtenSummary = JSON.parse(await readFile(join(outDir, "summary.json"), "utf8"));
    assert.equal(writtenSummary.target_count, 15);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test("expanded testbed CLI writes an expanded public summary", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "foldgen-m10-cli-"));
  try {
    const { stdout } = await execFileAsync("node", ["packages/foldgen-agent/bin/run-testbed.mjs", outDir]);
    const summary = JSON.parse(stdout);
    assert.equal(summary.ok, true);
    assert.equal(summary.target_count, 15);
    assert.equal(summary.creative_reference_count, 5);
    assert.equal(summary.cases.length, 15);
    assert.ok(summary.cases.every((testbedCase) => testbedCase.ok === true));
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test("known-good tutorial fixture gate promotes only solver-derived provenance cases", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "foldgen-known-good-tutorials-"));
  try {
    const result = await runKnownGoodTutorialFixtureGate({ outDir });
    assert.equal(result.ok, true, result.errors.join("\n"));
    assert.equal(result.promotion_allowed_case_count, 4);
    assert.deepEqual(result.promoted_cases.sort(), ["known-good-corner", "known-good-paper-hat", "known-good-square-packet", "known-good-triangle"]);
    assert.equal(result.recognizable_completed_case_count, 2);
    assert.equal(result.boat.display_mode, "blocked-solver");
    const triangle = result.cases.find((entry) => entry.case_id === "known-good-triangle");
    const paperHat = result.cases.find((entry) => entry.case_id === "known-good-paper-hat");
    const squarePacket = result.cases.find((entry) => entry.case_id === "known-good-square-packet");
    const boat = result.cases.find((entry) => entry.case_id === "simple-boat");
    assert.equal(triangle.promotion_allowed, true);
    assert.equal(paperHat.promotion_allowed, true);
    assert.equal(squarePacket.promotion_allowed, true);
    assert.equal(boat.promotion_allowed, false);
    const triangleProvenance = JSON.parse(await readFile(join(process.cwd(), triangle.provenance_path), "utf8"));
    assert.equal(triangleProvenance.source_kind, "repo-authored-solver-derived-fixture");
    assert.equal(triangleProvenance.promotion_allowed, true);
    const paperHatProvenance = JSON.parse(await readFile(join(process.cwd(), paperHat.provenance_path), "utf8"));
    assert.equal(paperHatProvenance.recognizable, true);
    assert.equal(paperHatProvenance.promotion_allowed, true);
    const squarePacketProvenance = JSON.parse(await readFile(join(process.cwd(), squarePacket.provenance_path), "utf8"));
    assert.equal(squarePacketProvenance.recognizable, true);
    assert.equal(squarePacketProvenance.promotion_allowed, true);
    const boatProvenance = JSON.parse(await readFile(join(process.cwd(), boat.provenance_path), "utf8"));
    assert.equal(boatProvenance.source_kind, "generated-curated-cue-sequence");
    assert.equal(boatProvenance.promotion_allowed, false);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test("source provenance refuses generated cue sequence promotion", () => {
  const provenance = createSourceProvenance({
    pipelineOutDir: "out/example",
    pipelineCase: {
      case_id: "simple-boat",
      target: { file: "simple-boat.svg" },
      status: "valid",
      display_mode: "completed-usable",
      validation_status: true,
      step_state_status: "complete",
      artifact_paths: {
        derived_fold: "out/example/simple-boat/derived.fold",
        folded_state_fold: "out/example/simple-boat/folded-state.fold",
        display_decision: "out/example/simple-boat/display-decision.json"
      }
    }
  });
  assert.equal(provenance.source_kind, "generated-curated-cue-sequence");
  assert.equal(provenance.promotion_allowed, false);
});
