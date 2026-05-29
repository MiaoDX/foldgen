#!/usr/bin/env node
import { runGeneratedCandidateHarnessGate } from "../src/index.mjs";

const outDir = process.argv[2] ?? "out/m30-generated-candidate-harness";

try {
  const result = await runGeneratedCandidateHarnessGate({ outDir });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}
