#!/usr/bin/env node
import { runCuratedPipeline } from "../src/index.mjs";

const outDir = process.argv[2] ?? "out/m2-pipeline";

try {
  const summary = await runCuratedPipeline({ outDir });
  console.log(JSON.stringify({
    ok: summary.ok,
    outDir,
    case_count: summary.case_count,
    claim_status: summary.claim_status,
    cases: summary.cases.map((pipelineCase) => ({
      case_id: pipelineCase.case_id,
      status: pipelineCase.status,
      claim_status: pipelineCase.claim_status,
      executor_readable: pipelineCase.executor_readable,
      executor_profile: pipelineCase.executor_profile,
      executor_profiles: pipelineCase.executor_profiles,
      selected_base_form: pipelineCase.selected_base_form,
      selected_candidate_id: pipelineCase.selected_candidate_id
    }))
  }, null, 2));

  if (!summary.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
