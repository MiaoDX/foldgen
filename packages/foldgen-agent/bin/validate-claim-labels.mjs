#!/usr/bin/env node
import { validateStage1ClaimLabels } from "../src/index.mjs";

const summaryPath = process.argv[2] ?? "out/m2-pipeline/summary.json";
const result = await validateStage1ClaimLabels({ summaryPath });

console.log(JSON.stringify(result, null, 2));
if (!result.ok) {
  process.exitCode = 1;
}
