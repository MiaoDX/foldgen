#!/usr/bin/env node
import { readFile } from "node:fs/promises";

import { runKnownGoodTutorialFixtureGate } from "../src/index.mjs";

const outDir = process.argv[2] ?? "out/m20-known-good-tutorials";

try {
  const result = await runKnownGoodTutorialFixtureGate({ outDir });
  const errors = [...result.errors];

  if (result.promotion_allowed_case_count < 4) {
    errors.push(`expected at least four promotion-allowed tutorial fixtures, got ${result.promotion_allowed_case_count}`);
  }
  if (result.recognizable_completed_case_count < 1) {
    errors.push("expected at least one recognizable promotion-allowed tutorial fixture");
  }
  for (const caseId of ["known-good-triangle", "known-good-corner", "known-good-paper-hat", "known-good-square-packet"]) {
    if (!result.promoted_cases.includes(caseId)) {
      errors.push(`${caseId} fixture must be promotion-allowed`);
    }
  }
  if (result.boat?.display_mode !== "blocked-solver") {
    errors.push(`boat must remain blocked-solver, got ${result.boat?.display_mode ?? "missing"}`);
  }

  for (const entry of result.cases) {
    const provenance = JSON.parse(await readFile(entry.provenance_path, "utf8"));
    if (provenance.type !== "foldgen.source_provenance.v1") {
      errors.push(`${entry.case_id}: invalid provenance type`);
    }
    if (entry.promotion_allowed && provenance.source_kind !== "repo-authored-solver-derived-fixture") {
      errors.push(`${entry.case_id}: promoted case must use repo-authored solver-derived provenance`);
    }
    if (!entry.promotion_allowed && provenance.promotion_allowed === true) {
      errors.push(`${entry.case_id}: provenance promotion flag disagrees with summary`);
    }
  }

  const output = {
    ok: errors.length === 0,
    outDir,
    status: errors.length === 0 ? result.status : "failed",
    promotion_allowed_case_count: result.promotion_allowed_case_count,
    promoted_cases: result.promoted_cases,
    recognizable_completed_case_count: result.recognizable_completed_case_count,
    boat: result.boat,
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
