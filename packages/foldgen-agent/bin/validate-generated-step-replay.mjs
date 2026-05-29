#!/usr/bin/env node
import { runGeneratedStepReplayGate } from "../src/index.mjs";

const outDir = process.argv[2] ?? "out/m33-generated-step-replay";

try {
  const result = await runGeneratedStepReplayGate({ outDir });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}
