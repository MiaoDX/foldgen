import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";
import assert from "node:assert/strict";

import {
  applyLocalFoldOperation,
  createCreasePatternSvg,
  createDiagramStep,
  createPreviewModel,
  deterministicDemoOperation,
  executorProfiles,
  loadFoldFile,
  parseFold,
  serializeFold,
  validateExecutorReadableStep,
  validateFold
} from "../src/index.mjs";

const execFileAsync = promisify(execFile);

test("valid fixtures pass and malformed fixture fails", async () => {
  const { stdout } = await execFileAsync("node", ["packages/fold-core/bin/validate-fixtures.mjs"]);
  const result = JSON.parse(stdout);
  assert.equal(result.ok, true);
  assert.equal(result.results.filter((entry) => entry.ok).length, 5);
  assert.equal(result.results.find((entry) => entry.file === "malformed.fold").ok, false);
});

test("parse and serialize round-trip is deterministic", async () => {
  const fold = await loadFoldFile("benchmarks/base-forms/kite-base.fold");
  const roundTrip = parseFold(serializeFold(fold));
  assert.deepEqual(roundTrip, fold);
  assert.equal(serializeFold(fold), serializeFold(roundTrip));
});

test("structural validation catches invalid edge references", () => {
  const result = validateFold({
    file_spec: 1.2,
    vertices_coords: [[0, 0], [1, 0], [1, 1]],
    edges_vertices: [[0, 3]],
    edges_assignment: ["V"]
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /out-of-range/);
});

test("local fold operation supports optional edge assignments", () => {
  const source = {
    file_spec: 1.2,
    file_title: "assignment-free source",
    vertices_coords: [[0, 0], [1, 0], [1, 1], [0, 1]],
    edges_vertices: [[0, 1], [1, 2], [2, 3], [3, 0]]
  };
  const operation = {
    id: "add-diagonal",
    name: "Add diagonal",
    assignment: "V",
    edge: [0, 2],
    instruction: "Fold along the diagonal."
  };

  const derived = applyLocalFoldOperation(source, operation);
  assert.equal(validateFold(derived).ok, true);
  assert.deepEqual(derived.edges_assignment, ["U", "U", "U", "U", "V"]);
});

test("crease SVG output is deterministic", async () => {
  const fold = await loadFoldFile("benchmarks/base-forms/kite-base.fold");
  const derived = applyLocalFoldOperation(fold, deterministicDemoOperation);
  const svg = createCreasePatternSvg(derived, { size: 128, padding: 8 });
  assert.equal(svg, createCreasePatternSvg(derived, { size: 128, padding: 8 }));
  assert.match(svg, /class="valley"/);
  assert.match(svg, /width="128"/);
});

test("preview model output is deterministic inspection data", async () => {
  const fold = await loadFoldFile("benchmarks/base-forms/kite-base.fold");
  const derived = applyLocalFoldOperation(fold, deterministicDemoOperation);
  const preview = createPreviewModel(derived);
  assert.deepEqual(preview, createPreviewModel(derived));
  assert.equal(preview.type, "foldgen.preview.v1");
  assert.equal(preview.vertices.length, derived.vertices_coords.length);
  assert.equal(preview.edges.length, derived.edges_vertices.length);
});

test("diagram step contains executor-readable action structure", () => {
  const step = createDiagramStep(deterministicDemoOperation, 1);
  const result = validateExecutorReadableStep(step);

  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(step.executor_profile, "human-hand");
  assert.equal(step.executor_profile_definition.id, "human-hand");
  assert.deepEqual(executorProfiles["cat-paw-profile"].unavailable_actions, ["precision pinch", "two-point alignment"]);
  assert.deepEqual(step.fold.landmarks, {
    start: "left midpoint",
    end: "right midpoint",
    line: "horizontal midpoint crease"
  });
  assert.deepEqual(step.actions.map((action) => action.phase), ["setup", "anchor", "fold", "align", "crease", "release"]);
  assert.equal(step.checks.length >= 2, true);
  assert.equal(step.failure_modes.length >= 1, true);
  assert.equal(step.annotations.some((annotation) => annotation.type === "motion-arrow"), true);

  const invalid = {
    ...step,
    actions: step.actions.filter((action) => action.phase !== "align")
  };
  assert.equal(validateExecutorReadableStep(invalid).ok, false);
});

test("deterministic case writes valid FOLD, SVG, validation, and diagram step", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "foldgen-m1-"));
  try {
    const { stdout } = await execFileAsync("node", ["packages/fold-core/bin/run-deterministic-case.mjs", outDir]);
    const summary = JSON.parse(stdout);
    assert.equal(summary.ok, true);
    assert.ok(summary.files.includes("preview.json"));

    const derived = parseFold(await readFile(join(outDir, "derived.fold"), "utf8"));
    assert.equal(validateFold(derived).ok, true);
    assert.match(await readFile(join(outDir, "crease.svg"), "utf8"), /<svg/);

    const validation = JSON.parse(await readFile(join(outDir, "validation.json"), "utf8"));
    assert.equal(validation.ok, true);

    const step = JSON.parse(await readFile(join(outDir, "diagram-step.json"), "utf8"));
    assert.deepEqual(step, createDiagramStep(deterministicDemoOperation, 1));
    assert.equal(validateExecutorReadableStep(step).ok, true);

    const preview = JSON.parse(await readFile(join(outDir, "preview.json"), "utf8"));
    assert.deepEqual(preview, createPreviewModel(derived));
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});
