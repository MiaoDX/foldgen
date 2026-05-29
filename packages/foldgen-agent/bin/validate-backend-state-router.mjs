#!/usr/bin/env node
import { runBackendStateRouterGate } from "../src/index.mjs";

const outDir = process.argv[2] ?? "out/m31-backend-state-router";

try {
  const result = await runBackendStateRouterGate({ outDir });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}
