#!/usr/bin/env node
import { runFlatFolderValidation } from "../src/index.mjs";

const summaryPath = process.argv[2] ?? "out/m2-pipeline/summary.json";

try {
  const result = await runFlatFolderValidation({ summaryPath });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
