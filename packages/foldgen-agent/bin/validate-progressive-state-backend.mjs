#!/usr/bin/env node
import { runProgressiveStateBackendGate } from "../src/index.mjs";

const outDir = process.argv[2] ?? "out/m26-progressive-state-backend";

try {
  const result = await runProgressiveStateBackendGate({ outDir });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}
