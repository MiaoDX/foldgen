#!/usr/bin/env node
import { runGeneratedTargetScorerGate } from "../src/index.mjs";

const outDir = process.argv[2] ?? "out/m32-generated-target-scorer";

try {
  const result = await runGeneratedTargetScorerGate({ outDir });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}
