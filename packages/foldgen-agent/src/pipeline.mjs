import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import {
  applyLocalFoldOperation,
  createCreasePatternSvg,
  createDiagramStep,
  createPreviewModel,
  loadFoldFile,
  serializeFold,
  stableStringify,
  validateFold
} from "../../fold-core/src/index.mjs";

export const targetProfiles = {
  "simple-bird.svg": {
    caseId: "simple-bird",
    baseForm: "bird-base.fold",
    targetFeatures: ["wings", "beak", "upright silhouette"],
    candidates: [
      candidate("bird-centerline-wing", "Add a centerline wing valley", "V", [5, 6], 0.82, "Adds a broad wing crease across the bird base."),
      candidate("bird-diagonal-beak", "Sharpen the beak diagonal", "M", [0, 2], 0.68, "Reuses the diagonal to emphasize a beak-like point."),
      invalidCandidate("bird-overextended-tail")
    ]
  },
  "simple-fish.svg": {
    caseId: "simple-fish",
    baseForm: "fish-base.fold",
    targetFeatures: ["tail", "body", "horizontal silhouette"],
    candidates: [
      candidate("fish-tail-centerline", "Add a tail centerline valley", "V", [5, 6], 0.84, "Adds a tail/body separation crease to the fish base."),
      candidate("fish-body-diagonal", "Bias the body diagonal", "M", [0, 2], 0.64, "Keeps a simple asymmetric body cue."),
      invalidCandidate("fish-overextended-fin")
    ]
  },
  "simple-flower.svg": {
    caseId: "simple-flower",
    baseForm: "waterbomb-base.fold",
    targetFeatures: ["petals", "radial symmetry", "center"],
    candidates: [
      candidate("flower-petal-centerline", "Add a petal centerline valley", "V", [5, 6], 0.8, "Adds a simple petal split while preserving radial structure."),
      candidate("flower-cross-diagonal", "Reinforce flower diagonal", "M", [1, 3], 0.7, "Uses a crossing diagonal as a second petal cue."),
      invalidCandidate("flower-outside-paper")
    ]
  },
  "simple-boat.svg": {
    caseId: "simple-boat",
    baseForm: "kite-base.fold",
    targetFeatures: ["sail", "hull", "mast"],
    candidates: [
      candidate("boat-mast-centerline", "Add a mast centerline valley", "V", [5, 6], 0.83, "Creates a strong mast-like vertical reference in the kite base."),
      candidate("boat-hull-diagonal", "Tilt hull diagonal", "M", [0, 2], 0.62, "Keeps a hull-like diagonal cue for the lower shape."),
      invalidCandidate("boat-overextended-sail")
    ]
  },
  "simple-star.svg": {
    caseId: "simple-star",
    baseForm: "frog-base.fold",
    targetFeatures: ["points", "radial folds", "center"],
    candidates: [
      candidate("star-point-centerline", "Add a point centerline valley", "V", [5, 6], 0.78, "Adds a symmetric point split to the frog base."),
      candidate("star-cross-diagonal", "Reinforce star diagonal", "M", [1, 3], 0.72, "Adds a crossing fold useful for a point-like silhouette."),
      invalidCandidate("star-outside-paper")
    ]
  }
};

export async function runCuratedPipeline(options = {}) {
  const baseFormsDir = options.baseFormsDir ?? "benchmarks/base-forms";
  const targetsDir = options.targetsDir ?? "benchmarks/targets";
  const outDir = options.outDir ?? "out/m2-pipeline";
  const targetFiles = options.targetFiles ?? Object.keys(targetProfiles);
  const metadata = JSON.parse(await readFile(join(targetsDir, "metadata.json"), "utf8"));
  const targets = selectTargets(metadata.targets, targetFiles);

  if (targets.length < 5) {
    throw new Error(`M2 pipeline requires five curated targets, found ${targets.length}`);
  }

  await mkdir(outDir, { recursive: true });

  const cases = await Promise.all(
    targets.map((target) => runTargetCase({ target, profile: targetProfiles[target.file], baseFormsDir, targetsDir, outDir }))
  );

  const summary = {
    milestone: "M2",
    ok: cases.length >= 5 && cases.every((pipelineCase) => pipelineCase.status === "valid"),
    case_count: cases.length,
    cases
  };
  await writeJson(join(outDir, "summary.json"), summary);
  return summary;
}

async function runTargetCase({ target, profile, baseFormsDir, targetsDir, outDir }) {
  const caseDir = join(outDir, profile.caseId);
  await mkdir(caseDir, { recursive: true });
  await readFile(join(targetsDir, target.file), "utf8");

  const baseFold = await loadFoldFile(join(baseFormsDir, profile.baseForm));
  const records = profile.candidates.map((candidateConfig, index) => buildCandidateRecord(baseFold, candidateConfig, index));
  const selected = selectBestValidCandidate(records);
  const proposalHistory = buildProposalHistory(target, profile, records, selected);
  const criticHistory = buildCriticHistory(target, profile, records, selected);

  const artifactPaths = {
    proposal_history: artifactPath(join(caseDir, "proposal-history.json")),
    critic_history: artifactPath(join(caseDir, "critic-history.json")),
    case_summary: artifactPath(join(caseDir, "summary.json"))
  };

  let selectedValidation = { ok: false, errors: ["No valid candidate selected"], warnings: [] };
  if (selected) {
    selectedValidation = selected.validation;
    artifactPaths.derived_fold = artifactPath(join(caseDir, "derived.fold"));
    artifactPaths.crease_svg = artifactPath(join(caseDir, "crease.svg"));
    artifactPaths.validation = artifactPath(join(caseDir, "validation.json"));
    artifactPaths.diagram_step = artifactPath(join(caseDir, "diagram-step.json"));
    artifactPaths.preview = artifactPath(join(caseDir, "preview.json"));

    await writeFile(join(caseDir, "derived.fold"), serializeFold(selected.derived), "utf8");
    await writeFile(join(caseDir, "crease.svg"), createCreasePatternSvg(selected.derived), "utf8");
    await writeJson(join(caseDir, "validation.json"), selected.validation);
    await writeJson(join(caseDir, "diagram-step.json"), createDiagramStep(selected.operation, 1));
    await writeJson(join(caseDir, "preview.json"), createPreviewModel(selected.derived));
  }

  const caseSummary = {
    case_id: profile.caseId,
    target: {
      name: target.name,
      file: target.file
    },
    selected_base_form: profile.baseForm,
    status: selected ? "valid" : "failed",
    selected_candidate_id: selected?.candidate_id ?? null,
    validation_status: selectedValidation.ok,
    candidate_count: records.length,
    rejected_candidate_count: records.filter((record) => !record.validation.ok).length,
    candidate_operations: records.map((record) => ({
      candidate_id: record.candidate_id,
      operation_id: record.operation.id,
      assignment: record.operation.assignment,
      edge: record.operation.edge,
      validation_status: record.validation.ok ? "valid" : "invalid"
    })),
    artifact_paths: artifactPaths
  };

  await writeJson(join(caseDir, "proposal-history.json"), proposalHistory);
  await writeJson(join(caseDir, "critic-history.json"), criticHistory);
  await writeJson(join(caseDir, "summary.json"), caseSummary);

  return caseSummary;
}

function buildCandidateRecord(baseFold, candidateConfig, index) {
  const derived = applyLocalFoldOperation(baseFold, candidateConfig.operation);
  const validation = validateFold(derived);
  return {
    rank: index + 1,
    candidate_id: candidateConfig.id,
    rationale: candidateConfig.rationale,
    operation: cloneJson(candidateConfig.operation),
    score: validation.ok ? candidateConfig.score : 0,
    validation,
    derived
  };
}

function selectBestValidCandidate(records) {
  return records
    .filter((record) => record.validation.ok)
    .sort((a, b) => b.score - a.score || a.rank - b.rank)[0] ?? null;
}

function buildProposalHistory(target, profile, records, selected) {
  return {
    case_id: profile.caseId,
    target: {
      name: target.name,
      file: target.file
    },
    selected_base_form: profile.baseForm,
    strategy: "deterministic-curated-profile-v0",
    target_features: profile.targetFeatures,
    candidates: records.map((record) => ({
      rank: record.rank,
      candidate_id: record.candidate_id,
      selected: record.candidate_id === selected?.candidate_id,
      rationale: record.rationale,
      operation: record.operation,
      validation_status: record.validation.ok ? "valid" : "invalid",
      validation_errors: record.validation.errors
    }))
  };
}

function buildCriticHistory(target, profile, records, selected) {
  return {
    case_id: profile.caseId,
    target: {
      name: target.name,
      file: target.file
    },
    evaluator: "deterministic-validation-and-profile-score-v0",
    entries: records.map((record) => ({
      candidate_id: record.candidate_id,
      selected: record.candidate_id === selected?.candidate_id,
      validation_ok: record.validation.ok,
      score: record.score,
      verdict: record.validation.ok ? "ranked-valid" : "rejected-invalid",
      notes: record.validation.ok ? [record.rationale] : record.validation.errors
    }))
  };
}

function selectTargets(targets, targetFiles) {
  const byFile = new Map(targets.map((target) => [target.file, target]));
  return targetFiles.map((file) => {
    const target = byFile.get(file);
    if (!target) {
      throw new Error(`${file}: missing target metadata`);
    }
    if (!targetProfiles[file]) {
      throw new Error(`${file}: missing deterministic M2 profile`);
    }
    return target;
  });
}

function candidate(id, name, assignment, edge, score, rationale) {
  return {
    id,
    score,
    rationale,
    operation: {
      id,
      name,
      assignment,
      edge,
      instruction: `${name}.`
    }
  };
}

function invalidCandidate(id) {
  return candidate(id, "Reject out-of-range exploratory fold", "V", [0, 99], 0, "Records how invalid proposals are kept as pipeline data.");
}

async function writeJson(path, value) {
  await writeFile(path, `${stableStringify(value, 2)}\n`, "utf8");
}

function artifactPath(path) {
  return toPosix(relative(process.cwd(), path));
}

function toPosix(path) {
  return path.split("\\").join("/");
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}
