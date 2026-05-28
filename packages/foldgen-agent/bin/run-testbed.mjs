#!/usr/bin/env node
import { runExpandedTestbed } from "../src/index.mjs";

const outDir = process.argv[2] ?? "out/m10-testbed";

try {
  const summary = await runExpandedTestbed({ outDir });
  console.log(JSON.stringify({
    ok: summary.ok,
    outDir,
    target_count: summary.target_count,
    creative_reference_count: summary.creative_reference_count,
    cases: summary.cases.map((testbedCase) => ({
      target_file: testbedCase.target_file,
      ok: testbedCase.ok,
      selected_case_id: testbedCase.selected_case_id,
      selected_base_form: testbedCase.selected_base_form,
      executor_readable: testbedCase.executor_readable
    }))
  }, null, 2));

  if (!summary.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
