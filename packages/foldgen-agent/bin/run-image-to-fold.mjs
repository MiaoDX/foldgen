#!/usr/bin/env node
import { runImageToFold } from "../src/index.mjs";

const referencePath = process.argv[2] ?? "benchmarks/targets/simple-bird.svg";
const outDir = process.argv[3] ?? "out/m9-image-to-fold";

try {
  const summary = await runImageToFold({ referencePath, outDir });
  console.log(JSON.stringify({
    ok: summary.ok,
    outDir,
    reference_path: summary.reference_path,
    selected_case_id: summary.selection.selected_case_id,
    selected_base_form: summary.selection.selected_base_form,
    selected_target_file: summary.selection.selected_target_file,
    selection_score: summary.selection.score,
    search_status: summary.search_case.search_status,
    selected_operation_count: summary.search_case.selected_operation_count,
    executor_readable: summary.search_case.executor_readable,
    executor_profiles: summary.search_case.executor_profiles
  }, null, 2));

  if (!summary.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
