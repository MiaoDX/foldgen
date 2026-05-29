#!/usr/bin/env node
import { runGeneratedExecutorFeasibilityGate } from "../src/index.mjs";

const outDir = process.argv[2] ?? "out/m34-generated-executor-feasibility";

try {
  const result = await runGeneratedExecutorFeasibilityGate({ outDir });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}
