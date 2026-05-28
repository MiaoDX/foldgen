import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import assert from "node:assert/strict";

import { analyzeReferenceImage, runExpandedTestbed, selectProfileForImage } from "../src/index.mjs";

const execFileAsync = promisify(execFile);

test("expanded target metadata includes ten public cases", async () => {
  const metadata = JSON.parse(await readFile("benchmarks/targets/metadata.json", "utf8"));
  assert.equal(metadata.targets.length, 10);
  assert.equal(metadata.targets.filter((target) => String(target.usage).includes("creative/reference")).length, 5);
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
    assert.equal(summary.target_count, 10);
    assert.equal(summary.creative_reference_count, 5);
    assert.equal(summary.cases.length, 10);
    assert.ok(summary.cases.every((testbedCase) => testbedCase.executor_readable === true));
    assert.ok(summary.cases.every((testbedCase) => testbedCase.selected_operation_count === 2));
    assert.ok(summary.cases.some((testbedCase) => testbedCase.target_file === "creative-crane.svg" && testbedCase.selected_case_id === "simple-bird"));
    assert.ok(summary.cases.some((testbedCase) => testbedCase.target_file === "creative-sunstar.svg" && testbedCase.selected_case_id === "simple-star"));

    const writtenSummary = JSON.parse(await readFile(join(outDir, "summary.json"), "utf8"));
    assert.equal(writtenSummary.target_count, 10);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test("expanded testbed CLI writes a ten-case summary", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "foldgen-m10-cli-"));
  try {
    const { stdout } = await execFileAsync("node", ["packages/foldgen-agent/bin/run-testbed.mjs", outDir]);
    const summary = JSON.parse(stdout);
    assert.equal(summary.ok, true);
    assert.equal(summary.target_count, 10);
    assert.equal(summary.creative_reference_count, 5);
    assert.equal(summary.cases.length, 10);
    assert.ok(summary.cases.every((testbedCase) => testbedCase.ok === true));
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});
