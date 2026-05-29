#!/usr/bin/env node
import { readFile } from "node:fs/promises";

import { runSolverBackedSearchGate } from "../src/index.mjs";

const outDir = process.argv[2] ?? "out/m23-solver-backed-search";

try {
  const result = await runSolverBackedSearchGate({ outDir });
  const errors = [...result.errors];

  if (result.completed_usable_selection_count < 4) {
    errors.push(`expected at least four completed-usable selections, got ${result.completed_usable_selection_count}`);
  }
  for (const entry of result.cases) {
    const record = JSON.parse(await readFile(entry.record_path, "utf8"));
    const selected = record.candidates.find((candidate) => candidate.selected);
    if (!selected) {
      errors.push(`${entry.case_id}: missing selected candidate`);
      continue;
    }
    if (record.selected_candidate_id !== selected.candidate_id) {
      errors.push(`${entry.case_id}: record selected candidate id mismatch`);
    }
    if (record.selected_display_mode !== selected.display_mode) {
      errors.push(`${entry.case_id}: record selected display mode mismatch`);
    }
    if (selected.display_mode === "completed-usable" && selected.completed_usable !== true) {
      errors.push(`${entry.case_id}: completed-usable selection must have completed_usable=true`);
    }
    if (selected.display_mode.startsWith("blocked-") && selected.hard_gate_passed === true) {
      errors.push(`${entry.case_id}: blocked selection must not pass hard gate`);
    }
    if (!record.selection_policy.some((policy) => policy.includes("display-decision.json"))) {
      errors.push(`${entry.case_id}: selection policy must reference display-decision.json`);
    }
  }

  const output = {
    ok: errors.length === 0,
    outDir,
    status: errors.length === 0 ? result.status : "failed",
    completed_usable_selection_count: result.completed_usable_selection_count,
    cases: result.cases,
    errors
  };
  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}
