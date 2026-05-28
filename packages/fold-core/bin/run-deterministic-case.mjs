#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  applyLocalFoldOperation,
  createCreasePatternSvg,
  createDiagramStep,
  deterministicDemoOperation,
  loadFoldFile,
  serializeFold,
  validateFold
} from "../src/index.mjs";

const outDir = process.argv[2] ?? "out/m1-deterministic";
await mkdir(outDir, { recursive: true });

const source = await loadFoldFile("benchmarks/base-forms/kite-base.fold");
const derived = applyLocalFoldOperation(source, deterministicDemoOperation);
const validation = validateFold(derived);
const svg = createCreasePatternSvg(derived);
const diagramStep = createDiagramStep(deterministicDemoOperation, 1);

await writeFile(join(outDir, "derived.fold"), serializeFold(derived), "utf8");
await writeFile(join(outDir, "crease.svg"), svg, "utf8");
await writeFile(join(outDir, "validation.json"), `${JSON.stringify(validation, null, 2)}\n`, "utf8");
await writeFile(join(outDir, "diagram-step.json"), `${JSON.stringify(diagramStep, null, 2)}\n`, "utf8");

console.log(JSON.stringify({ ok: validation.ok, outDir, files: ["derived.fold", "crease.svg", "validation.json", "diagram-step.json"] }, null, 2));
if (!validation.ok) {
  process.exitCode = 1;
}
