#!/usr/bin/env node
import { runGeneratedPreviewReviewGate } from "../src/index.mjs";

const outDir = process.argv[2] ?? "out/m35-generated-preview-review";

try {
  const result = await runGeneratedPreviewReviewGate({ outDir });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}
