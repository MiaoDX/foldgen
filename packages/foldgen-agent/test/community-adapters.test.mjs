import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
  checkCommunityFoldArtifact,
  collectFoldArtifactPaths,
  runCommunityFoldCompatibility,
  runCuratedPipeline,
  validateFlatFolderArtifact
} from "../src/index.mjs";

test("community FOLD compatibility records expected invalid fixture separately", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "foldgen-community-fold-"));
  try {
    await runCuratedPipeline({ outDir: join(outDir, "m2-pipeline") });
    const paths = await collectFoldArtifactPaths({
      pipelineDir: join(outDir, "m2-pipeline")
    });
    assert.equal(paths.length, 16);
    assert.equal(paths.some((entry) => entry.path.endsWith("malformed.fold") && entry.expected_valid === false), true);
    assert.equal(paths.filter((entry) => entry.path.endsWith("derived.fold")).length, 5);
    assert.equal(paths.filter((entry) => entry.path.endsWith("origami-simulator.fold")).length, 5);

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
