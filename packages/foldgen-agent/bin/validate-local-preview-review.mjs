#!/usr/bin/env node
import { runLocalPreviewReviewGate } from "../src/index.mjs";

const outDir = process.argv[2] ?? "out/m29-local-preview-review";

try {
  const result = await runLocalPreviewReviewGate({ outDir });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}
