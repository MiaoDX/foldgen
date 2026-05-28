#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  applyLocalFoldOperations,
  createCreasePatternSvg,
  createDiagramSequence,
  createDiagramStep,
  createPreviewAnimation,
  createPreviewModel,
  deterministicDemoOperations,
  loadFoldFile,
  serializeFold,
  stableStringify,
  validateExecutorReadableStep,
  validateFold
} from "../src/index.mjs";

const outDir = process.argv[2] ?? "out/m6-multistep";
const executorProfiles = ["human-hand", "two-finger-gripper", "cat-paw-profile", "dog-paw-profile"];
await mkdir(outDir, { recursive: true });

const source = await loadFoldFile("benchmarks/base-forms/kite-base.fold");
const derived = applyLocalFoldOperations(source, deterministicDemoOperations);
const validation = validateFold(derived);
const profileSequences = Object.fromEntries(executorProfiles.map((executorProfile) => {
  const steps = deterministicDemoOperations.map((operation, index) => createDiagramStep(operation, index + 1, {
    executorProfile,
    supportedExecutorProfiles: executorProfiles
  }));
  return [executorProfile, {
    sequence: createDiagramSequence(steps, { executorProfile }),
    validations: steps.map((step) => validateExecutorReadableStep(step))
  }];
}));

const defaultSequence = profileSequences["human-hand"].sequence;
const defaultStep = defaultSequence.steps[0];
const preview = createPreviewModel(derived);
const previewAnimation = createPreviewAnimation(derived);
const files = [
  "derived.fold",
  "crease.svg",
  "validation.json",
  "diagram-step.json",
  "diagram-sequence.json",
  "preview.json",
  "preview-animation.json",
  "summary.json",
  ...executorProfiles.map((executorProfile) => `diagram-sequence-${executorProfile}.json`)
];
const executorReadable = validation.ok && Object.values(profileSequences).every((entry) => (
  entry.validations.every((result) => result.ok)
));
const summary = {
  milestone: "M6",
  ok: validation.ok && executorReadable && defaultSequence.step_count > 1,
  operation_count: deterministicDemoOperations.length,
  history_count: derived.foldgen_history?.length ?? 0,
  step_count: defaultSequence.step_count,
  executor_profiles: executorProfiles,
  validation,
  executor_readable: executorReadable,
  outDir,
  files
};

await writeFile(join(outDir, "derived.fold"), serializeFold(derived), "utf8");
await writeFile(join(outDir, "crease.svg"), createCreasePatternSvg(derived), "utf8");
await writeJson(join(outDir, "validation.json"), validation);
await writeJson(join(outDir, "diagram-step.json"), defaultStep);
await writeJson(join(outDir, "diagram-sequence.json"), defaultSequence);
for (const [executorProfile, entry] of Object.entries(profileSequences)) {
  await writeJson(join(outDir, `diagram-sequence-${executorProfile}.json`), entry.sequence);
}
await writeJson(join(outDir, "preview.json"), preview);
await writeJson(join(outDir, "preview-animation.json"), previewAnimation);
await writeJson(join(outDir, "summary.json"), summary);

console.log(JSON.stringify(summary, null, 2));
if (!summary.ok) {
  process.exitCode = 1;
}

async function writeJson(path, value) {
  await writeFile(path, `${stableStringify(value, 2)}\n`, "utf8");
}
