#!/usr/bin/env node
import { runOriginalGapClosureAuditGate } from "../src/index.mjs";

const outDir = process.argv[2] ?? "out/m36-original-gap-closure-audit";

try {
  const result = await runOriginalGapClosureAuditGate({ outDir });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}
