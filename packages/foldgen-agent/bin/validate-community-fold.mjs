#!/usr/bin/env node
import { runCommunityFoldCompatibility } from "../src/index.mjs";

const outputPath = process.argv[2] ?? "out/community-validation/fold-compatibility.json";

try {
  const result = await runCommunityFoldCompatibility({ outputPath });
  console.log(JSON.stringify({
    ok: result.ok,
    status: result.status,
    checked_count: result.checked_count,
    output_artifact_paths: result.output_artifact_paths,
    unexpected_failures: result.results
      .filter((entry) => entry.status !== "passed" && entry.expected_result !== true)
      .map((entry) => ({
        input_artifact_path: entry.input_artifact_path,
        errors: entry.errors
      })),
    expected_failures: result.results
      .filter((entry) => entry.status !== "passed" && entry.expected_result === true)
      .map((entry) => ({
        input_artifact_path: entry.input_artifact_path,
        errors: entry.errors
      }))
  }, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
