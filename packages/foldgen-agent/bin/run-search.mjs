#!/usr/bin/env node
import { runLocalSearchBatch } from "../src/index.mjs";

const outDir = process.argv[2] ?? "out/m7-search";

try {
  const summary = await runLocalSearchBatch({ outDir });
  console.log(JSON.stringify({
    ok: summary.ok,
    outDir,
    case_count: summary.case_count,
    strategy: summary.strategy,
    cases: summary.cases.map((searchCase) => ({
      case_id: searchCase.case_id,
      status: searchCase.status,
      search_status: searchCase.search_status,
      selected_operation_count: searchCase.selected_operation_count,
      iteration_count: searchCase.iteration_count,
      final_score: searchCase.final_score,
      executor_readable: searchCase.executor_readable,
      executor_profiles: searchCase.executor_profiles,
      selected_operation_ids: searchCase.selected_operation_ids
    }))
  }, null, 2));

  if (!summary.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
