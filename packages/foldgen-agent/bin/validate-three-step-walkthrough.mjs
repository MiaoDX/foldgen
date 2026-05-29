#!/usr/bin/env node
import { runThreeStepWalkthroughGate } from "../src/index.mjs";

const outDir = process.argv[2] ?? "out/m27-three-step-walkthrough";

try {
  const result = await runThreeStepWalkthroughGate({ outDir });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}
