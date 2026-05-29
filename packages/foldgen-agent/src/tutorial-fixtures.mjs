import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

import { stableStringify } from "../../fold-core/src/index.mjs";
import { runCuratedPipeline } from "./pipeline.mjs";
import {
  createSourceProvenance,
  knownGoodTutorialCaseIds,
  recognizableKnownGoodCaseIds
} from "./source-provenance.mjs";

export async function runKnownGoodTutorialFixtureGate(options = {}) {
  const outDir = options.outDir ?? "out/m20-known-good-tutorials";
  const pipelineOutDir = join(outDir, "pipeline");
  await mkdir(outDir, { recursive: true });

  const pipelineSummary = await runCuratedPipeline({ outDir: pipelineOutDir });
  const cases = [];
  const errors = [];

  for (const pipelineCase of pipelineSummary.cases ?? []) {
    const provenance = createSourceProvenance({ pipelineCase, pipelineOutDir });
    const caseDir = join(outDir, pipelineCase.case_id);
    const provenancePath = join(caseDir, "source-provenance.json");
    await writeJson(provenancePath, provenance);
    const caseErrors = validateTutorialFixtureCase({ pipelineCase, provenance });
    cases.push({
      case_id: pipelineCase.case_id,
      status: caseErrors.length === 0 ? "passed" : "failed",
      source_kind: provenance.source_kind,
      promotion_allowed: provenance.promotion_allowed,
      display_mode: pipelineCase.display_mode,
      provenance_path: toRepoPath(provenancePath),
      errors: caseErrors
    });
    errors.push(...caseErrors.map((error) => `${pipelineCase.case_id}: ${error}`));
  }

  const promotedCases = cases.filter((entry) => entry.promotion_allowed && knownGoodTutorialCaseIds.has(entry.case_id));
  const recognizable = cases.filter((entry) => recognizableKnownGoodCaseIds.has(entry.case_id));
  const recognizableCompleted = recognizable.filter((entry) => entry.promotion_allowed);
  const boat = cases.find((entry) => entry.case_id === "simple-boat");
  if (promotedCases.length < 3) {
    errors.push(`expected at least three promotion-allowed known-good tutorial fixtures, got ${promotedCases.length}`);
  }
  if (recognizableCompleted.length < 1) {
    errors.push("expected at least one recognizable promotion-allowed known-good tutorial fixture");
  }
  if (boat?.display_mode !== "blocked-solver") {
    errors.push(`simple-boat must remain blocked-solver until a real tutorial/state source passes, got ${boat?.display_mode ?? "missing"}`);
  }

  const result = {
    type: "foldgen.known_good_tutorials.v1",
    ok: errors.length === 0,
    status: errors.length === 0 ? "passed" : "failed",
    outDir,
    pipeline_out_dir: pipelineOutDir,
    promotion_allowed_case_count: promotedCases.length,
    promoted_cases: promotedCases.map((entry) => entry.case_id),
    recognizable_completed_case_count: recognizableCompleted.length,
    recognizable_completed_cases: recognizableCompleted.map((entry) => entry.case_id),
    boat: boat ?? null,
    cases,
    errors
  };
  await writeJson(join(outDir, "summary.json"), result);
  return result;
}

function validateTutorialFixtureCase({ pipelineCase, provenance }) {
  const errors = [];
  if (!provenance.source_artifacts.target_svg) {
    errors.push("missing target SVG provenance");
  }
  if (provenance.promotion_allowed) {
    if (knownGoodTutorialCaseIds.has(pipelineCase.case_id) && pipelineCase.display_mode !== "completed-usable") {
      errors.push("promotion-allowed source must be completed-usable");
    }
    if (pipelineCase.step_state_status !== "complete") {
      errors.push("promotion-allowed source must have complete step states");
    }
    if (!pipelineCase.artifact_paths.display_decision) {
      errors.push("promotion-allowed source must include display-decision artifact");
    }
  }
  if (!knownGoodTutorialCaseIds.has(pipelineCase.case_id) && provenance.promotion_allowed && provenance.source_kind !== "generated-candidate-recipe") {
    errors.push("generated cue sequence cannot be promotion-allowed");
  }
  return errors;
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${stableStringify(value, 2)}\n`, "utf8");
}

function toRepoPath(path) {
  return relative(process.cwd(), path).split("\\").join("/");
}
