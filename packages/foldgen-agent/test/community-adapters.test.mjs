import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
  checkCommunityFoldArtifact,
  collectFoldArtifactPaths,
  createFlatFolderStateArtifact,
  runCommunityFoldCompatibility,
  runCuratedPipeline,
  runOrigamiSimulatorAdapterSpike,
  validateOrigamiSimulatorImportFold,
  validateFlatFolderArtifact
} from "../src/index.mjs";

test("community FOLD compatibility records expected invalid fixture separately", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "foldgen-community-fold-"));
  try {
    await runCuratedPipeline({ outDir: join(outDir, "m2-pipeline") });
    const paths = await collectFoldArtifactPaths({
      pipelineDir: join(outDir, "m2-pipeline")
    });
    const derivedCount = paths.filter((entry) => entry.path.endsWith("derived.fold")).length;
    const simulatorCount = paths.filter((entry) => entry.path.endsWith("origami-simulator.fold")).length;
    const foldedStateCount = paths.filter((entry) => entry.path.endsWith("folded-state.fold")).length;
    const baseFormCount = paths.filter((entry) => /benchmarks\/base-forms\/[^/]+-base\.fold$/.test(entry.path)).length;
    const expectedInvalidCount = paths.filter((entry) => entry.expected_valid === false).length;
    assert.equal(paths.length, derivedCount + simulatorCount + foldedStateCount + baseFormCount + expectedInvalidCount);
    assert.equal(paths.some((entry) => entry.path.endsWith("malformed.fold") && entry.expected_valid === false), true);
    assert.equal(derivedCount, 10);
    assert.equal(simulatorCount, 10);
    assert.equal(foldedStateCount, 7);
    assert.equal(baseFormCount, 5);

    const result = await runCommunityFoldCompatibility({
      paths,
      outputPath: join(outDir, "fold-compatibility.json")
    });
    assert.equal(result.ok, true);
    assert.equal(result.results.filter((entry) => entry.status === "failed").length, 1);
    const malformed = result.results.find((entry) => entry.input_artifact_path.endsWith("malformed.fold"));
    assert.equal(malformed.status, "failed");
    assert.equal(malformed.expected_valid, false);
    assert.equal(malformed.expected_result, true);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test("community FOLD adapter passes generated artifacts", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "foldgen-community-case-"));
  try {
    await runCuratedPipeline({ outDir });
    const result = await checkCommunityFoldArtifact(join(outDir, "simple-bird", "derived.fold"));
    assert.equal(result.status, "passed");
    assert.equal(result.expected_result, true);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test("Flat-Folder adapter writes explicit failed solver record for current cases", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "foldgen-flat-folder-"));
  try {
    await runCuratedPipeline({ outDir });
    const outputPath = join(outDir, "simple-bird", "flat-folder-validation.json");
    const result = await validateFlatFolderArtifact(join(outDir, "simple-bird", "derived.fold"), outputPath);
    assert.equal(result.status, "failed");
    assert.match(result.errors.join("\n"), /Unable to resolve/);
    assert.match(result.claim_effect, /must not be upgraded|keep public claim/);

    const written = JSON.parse(await readFile(outputPath, "utf8"));
    assert.equal(written.status, "failed");
    assert.ok(written.notes.length > 0);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test("Flat-Folder state adapter writes folded-state artifact for a passing case and conflict for boat", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "foldgen-flat-folder-state-"));
  try {
    await runCuratedPipeline({ outDir });
    const fishStatePath = join(outDir, "simple-fish", "flat-folder-state.json");
    const fishFoldPath = join(outDir, "simple-fish", "folded-state.fold");
    const fish = await createFlatFolderStateArtifact(join(outDir, "simple-fish", "derived.fold"), fishStatePath, fishFoldPath);
    assert.equal(fish.status, "passed");
    assert.equal(fish.folded_vertex_count > 0, true);
    assert.equal(fish.face_order_count > 0, true);
    assert.ok(fish.output_artifact_paths.some((path) => path.endsWith("folded-state.fold")));

    const folded = JSON.parse(await readFile(fishFoldPath, "utf8"));
    assert.equal(folded.file_classes.includes("foldedForm"), true);
    assert.equal(folded.vertices_coords.length, fish.folded_vertex_count);
    assert.equal(folded.faceOrders.length, fish.face_order_count);

    const boat = await createFlatFolderStateArtifact(
      join(outDir, "simple-boat", "derived.fold"),
      join(outDir, "simple-boat", "flat-folder-state.json"),
      join(outDir, "simple-boat", "folded-state.fold")
    );
    assert.equal(boat.status, "failed");
    assert.match(boat.errors.join("\n"), /Unable to resolve taco-taco/);
    assert.equal(boat.conflict.constraint_type, "taco-taco");
    assert.equal(boat.output_artifact_paths.some((path) => path.endsWith("folded-state.fold")), false);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test("Origami Simulator spike records progressive input frames without claiming solved backend states", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "foldgen-origami-simulator-spike-"));
  try {
    const record = await runOrigamiSimulatorAdapterSpike({ outDir });
    assert.equal(record.type, "foldgen.origami_simulator_spike.v1");
    assert.equal(record.import_compatibility.status, "passed");
    assert.equal(record.progressive_input_frames.status, "generated");
    assert.equal(record.progressive_input_frames.frame_count, 3);
    assert.equal(record.progressive_input_frames.changed_frame_count >= 2, true);
    assert.equal(record.status, "blocked-automated-state-export");
    assert.equal(record.decision, "manual-fixture-tool-only");
    assert.deepEqual(record.backend_state_artifacts, []);
    assert.match(record.automated_backend.blocker, /No isolated local Node\/headless adapter/);
    for (const frame of record.progressive_input_frames.frames) {
      const frameFold = JSON.parse(await readFile(join(process.cwd(), frame.path), "utf8"));
      assert.equal(frameFold.foldgen_origami_simulator_spike.status, "input-frame-not-simulated-state");
    }
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test("Origami Simulator import validation requires fold angles for deterministic frame generation", () => {
  const result = validateOrigamiSimulatorImportFold({
    vertices_coords: [[0, 0], [1, 0], [0, 1]],
    edges_vertices: [[0, 1], [1, 2], [2, 0]],
    edges_assignment: ["B", "V", "B"],
    faces_vertices: [[0, 1, 2]]
  });
  assert.equal(result.status, "failed");
  assert.match(result.errors.join("\n"), /edges_foldAngle/);
});
