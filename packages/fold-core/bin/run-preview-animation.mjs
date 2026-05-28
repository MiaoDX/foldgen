#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  applyLocalFoldOperations,
  createPreviewAnimation,
  deterministicDemoOperations,
  loadFoldFile,
  stableStringify
} from "../src/index.mjs";

const outDir = process.argv[2] ?? "out/m11-preview";
await mkdir(outDir, { recursive: true });

const source = await loadFoldFile("benchmarks/base-forms/kite-base.fold");
const derived = applyLocalFoldOperations(source, deterministicDemoOperations);
const animation = createPreviewAnimation(derived);
const summary = {
  milestone: "M11",
  ok: animation.frame_count > 1 && animation.operation_count === deterministicDemoOperations.length,
  frame_count: animation.frame_count,
  operation_count: animation.operation_count,
  outDir,
  files: ["preview-animation.json"]
};

await writeFile(join(outDir, "preview-animation.json"), `${stableStringify(animation, 2)}\n`, "utf8");
await writeFile(join(outDir, "summary.json"), `${stableStringify(summary, 2)}\n`, "utf8");

console.log(JSON.stringify(summary, null, 2));
if (!summary.ok) {
  process.exitCode = 1;
}
