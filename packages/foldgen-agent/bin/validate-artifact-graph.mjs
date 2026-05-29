#!/usr/bin/env node
import { runArtifactGraphGate } from "../src/index.mjs";

const outDir = process.argv[2] ?? "out/m24-artifact-graph";

try {
  const result = await runArtifactGraphGate({ outDir });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}
