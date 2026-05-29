#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { runCuratedPipeline, stage1ExecutorProfiles } from "../src/index.mjs";

const outDir = process.argv[2] ?? "out/m22-executor-overlay-artifacts";

try {
  const summary = await runCuratedPipeline({ outDir });
  const errors = [];
  const cases = [];

  for (const pipelineCase of summary.cases ?? []) {
    const caseErrors = [];
    const overlaySummary = JSON.parse(await readFile(join(outDir, pipelineCase.case_id, "executor-overlays", "executor-overlays.json"), "utf8"));
    const stepVisuals = JSON.parse(await readFile(join(outDir, pipelineCase.case_id, "step-visuals.json"), "utf8"));
    const displayDecision = JSON.parse(await readFile(join(outDir, pipelineCase.case_id, "display-decision.json"), "utf8"));

    if (pipelineCase.artifact_paths.executor_overlays !== `${outDir}/${pipelineCase.case_id}/executor-overlays/executor-overlays.json`) {
      caseErrors.push("summary artifact path must include executor-overlays.json");
    }
    if (overlaySummary.status !== "complete") {
      caseErrors.push(`executor overlay summary must be complete, got ${overlaySummary.status}`);
    }
    if (pipelineCase.external_validation.executor_overlays?.status !== "complete") {
      caseErrors.push("external validation must summarize complete executor overlays");
    }
    const gate = displayDecision.gates.find((entry) => entry.id === "executor-overlays");
    if (gate?.status !== "passed") {
      caseErrors.push("display decision executor-overlays gate must pass");
    }
    if (gate?.evidence?.artifact_path !== pipelineCase.artifact_paths.executor_overlays) {
      caseErrors.push("display decision executor overlay evidence must point at summary artifact");
    }

    for (const profile of stage1ExecutorProfiles) {
      const paths = overlaySummary.artifact_paths?.[profile] ?? [];
      const visuals = stepVisuals.profile_steps?.[profile] ?? [];
      if (paths.length !== pipelineCase.selected_operation_count) {
        caseErrors.push(`${profile}: expected ${pipelineCase.selected_operation_count} overlay paths, got ${paths.length}`);
      }
      for (let index = 0; index < paths.length; index += 1) {
        const artifact = JSON.parse(await readFile(paths[index], "utf8"));
        const visual = visuals[index];
        if (artifact.type !== "foldgen.executor_overlay_artifact.v1") {
          caseErrors.push(`${profile} step ${index + 1}: invalid overlay artifact type`);
        }
        if (visual?.executor_overlay_artifact_path !== paths[index]) {
          caseErrors.push(`${profile} step ${index + 1}: step visual must reference overlay artifact path`);
        }
        if (artifact.profile !== profile) {
          caseErrors.push(`${profile} step ${index + 1}: profile mismatch`);
        }
        if (artifact.operation_id !== visual?.operation_id) {
          caseErrors.push(`${profile} step ${index + 1}: operation id mismatch`);
        }
        if (artifact.geometry_bound !== true) {
          caseErrors.push(`${profile} step ${index + 1}: overlay must be geometry bound`);
        }
        if (!Array.isArray(artifact.zones) || artifact.zones.length === 0) {
          caseErrors.push(`${profile} step ${index + 1}: overlay zones missing`);
        }
        if (["cat-paw-profile", "dog-paw-profile"].includes(profile)) {
          if (artifact.status !== "precision-actions-blocked-or-fixture-needed") {
            caseErrors.push(`${profile} step ${index + 1}: paw profile must carry precision blocker status`);
          }
          if (!artifact.zones.some((zone) => zone.primitive === "blocked-precision")) {
            caseErrors.push(`${profile} step ${index + 1}: paw profile must include blocked precision zone`);
          }
        }
      }
    }

    cases.push({
      case_id: pipelineCase.case_id,
      display_mode: pipelineCase.display_mode,
      overlay_status: overlaySummary.status,
      profile_count: overlaySummary.profile_count,
      step_count: overlaySummary.step_count,
      errors: caseErrors
    });
    errors.push(...caseErrors.map((error) => `${pipelineCase.case_id}: ${error}`));
  }

  const result = {
    ok: errors.length === 0,
    outDir,
    case_count: cases.length,
    cases,
    errors
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}
