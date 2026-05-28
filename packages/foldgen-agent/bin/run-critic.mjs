#!/usr/bin/env node
import { runCriticBatch } from "../src/index.mjs";

const outDir = process.argv[2] ?? "out/m8-critic";

try {
  const summary = await runCriticBatch({ outDir });
  console.log(JSON.stringify({
    ok: summary.ok,
    outDir,
    case_count: summary.case_count,
    evaluator: summary.evaluator,
    cases: summary.cases.map((criticCase) => ({
      case_id: criticCase.case_id,
      status: criticCase.status,
      selected_candidate_id: criticCase.selected_candidate_id,
      selected_score: criticCase.selected_score,
      rejected_candidate_count: criticCase.rejected_candidate_count,
      executor_profiles: criticCase.executor_profiles
    }))
  }, null, 2));

  if (!summary.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
