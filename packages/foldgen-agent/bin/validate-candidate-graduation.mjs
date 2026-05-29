#!/usr/bin/env node
import { runCandidateGraduationGate } from "../src/index.mjs";

const outDir = process.argv[2] ?? "out/m28-candidate-graduation";

try {
  const result = await runCandidateGraduationGate({ outDir });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}
