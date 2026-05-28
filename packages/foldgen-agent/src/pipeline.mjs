import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import {
  applyLocalFoldOperations,
  createCreasePatternSvg,
  createDiagramSequence,
  createDiagramStep,
  createPreviewModel,
  loadFoldFile,
  serializeFold,
  stableStringify,
  validateExecutorReadableStep,
  validateFold
} from "../../fold-core/src/index.mjs";

export const stage1ExecutorProfiles = ["human-hand", "two-finger-gripper", "cat-paw-profile", "dog-paw-profile"];

export const targetProfiles = {
  "simple-bird.svg": {
    caseId: "simple-bird",
    baseForm: "bird-base.fold",
    targetFeatures: ["wings", "beak", "upright silhouette"],
    candidates: [
      sequenceCandidate("bird-wing-beak-sequence", "Add wing and beak folds", [
        operation("bird-centerline-wing", "Add a centerline wing valley", "V", [5, 6], "Adds a broad wing crease across the bird base."),
        operation("bird-diagonal-beak", "Sharpen the beak diagonal", "M", [0, 2], "Reuses the diagonal to emphasize a beak-like point.")
      ], 0.86, "Combines a broad wing crease with a diagonal beak cue."),
      candidate("bird-centerline-wing", "Add a centerline wing valley", "V", [5, 6], 0.82, "Adds a broad wing crease across the bird base."),
      invalidCandidate("bird-overextended-tail")
    ]
  },
  "simple-fish.svg": {
    caseId: "simple-fish",
    baseForm: "fish-base.fold",
    targetFeatures: ["tail", "body", "horizontal silhouette"],
    candidates: [
      sequenceCandidate("fish-tail-body-sequence", "Add tail and body folds", [
        operation("fish-tail-centerline", "Add a tail centerline valley", "V", [5, 6], "Adds a tail/body separation crease to the fish base."),
        operation("fish-body-diagonal", "Bias the body diagonal", "M", [0, 2], "Keeps a simple asymmetric body cue.")
      ], 0.87, "Combines tail separation with a body diagonal."),
      candidate("fish-tail-centerline", "Add a tail centerline valley", "V", [5, 6], 0.84, "Adds a tail/body separation crease to the fish base."),
      invalidCandidate("fish-overextended-fin")
    ]
  },
  "simple-flower.svg": {
    caseId: "simple-flower",
    baseForm: "waterbomb-base.fold",
    targetFeatures: ["petals", "radial symmetry", "center"],
    candidates: [
      sequenceCandidate("flower-petal-cross-sequence", "Add petal and cross folds", [
        operation("flower-petal-centerline", "Add a petal centerline valley", "V", [5, 6], "Adds a simple petal split while preserving radial structure."),
        operation("flower-cross-diagonal", "Reinforce flower diagonal", "M", [1, 3], "Uses a crossing diagonal as a second petal cue.")
      ], 0.85, "Combines midpoint and cross-diagonal petal cues."),
      candidate("flower-petal-centerline", "Add a petal centerline valley", "V", [5, 6], 0.8, "Adds a simple petal split while preserving radial structure."),
      invalidCandidate("flower-outside-paper")
    ]
  },
  "simple-boat.svg": {
    caseId: "simple-boat",
    baseForm: "kite-base.fold",
    targetFeatures: ["sail", "hull", "mast"],
    candidates: [
      sequenceCandidate("boat-mast-hull-sequence", "Add mast and hull folds", [
        operation("boat-mast-centerline", "Add a mast centerline valley", "V", [5, 6], "Creates a strong mast-like vertical reference in the kite base."),
        operation("boat-hull-diagonal", "Tilt hull diagonal", "M", [0, 2], "Keeps a hull-like diagonal cue for the lower shape.")
      ], 0.86, "Combines a mast centerline with a hull diagonal cue."),
      candidate("boat-mast-centerline", "Add a mast centerline valley", "V", [5, 6], 0.83, "Creates a strong mast-like vertical reference in the kite base."),
      invalidCandidate("boat-overextended-sail")
    ]
  },
  "simple-star.svg": {
    caseId: "simple-star",
    baseForm: "frog-base.fold",
    targetFeatures: ["points", "radial folds", "center"],
    candidates: [
      sequenceCandidate("star-point-cross-sequence", "Add point and cross folds", [
        operation("star-point-centerline", "Add a point centerline valley", "V", [5, 6], "Adds a symmetric point split to the frog base."),
        operation("star-cross-diagonal", "Reinforce star diagonal", "M", [1, 3], "Adds a crossing fold useful for a point-like silhouette.")
      ], 0.84, "Combines a symmetric point split with a cross-diagonal point cue."),
      candidate("star-point-centerline", "Add a point centerline valley", "V", [5, 6], 0.78, "Adds a symmetric point split to the frog base."),
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

  const simulatorValid = cases.length >= 5 && cases.every((pipelineCase) => pipelineCase.status === "valid");
  const executorReadable = cases.length >= 5 && cases.every((pipelineCase) => pipelineCase.executor_readable === true);
  const summary = {
    milestone: "M2",
    ok: simulatorValid && executorReadable,
    case_count: cases.length,
    claim_status: buildClaimStatus({ simulatorValid, executorReadable }),
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
  let diagramStepValidation = { ok: false, errors: ["No executor-readable step emitted"] };
  let diagramProfileValidation = {};
  let executorReadable = false;
  if (selected) {
    selectedValidation = selected.validation;
    artifactPaths.derived_fold = artifactPath(join(caseDir, "derived.fold"));
    artifactPaths.crease_svg = artifactPath(join(caseDir, "crease.svg"));
    artifactPaths.validation = artifactPath(join(caseDir, "validation.json"));
    artifactPaths.diagram_step = artifactPath(join(caseDir, "diagram-step.json"));
    artifactPaths.diagram_sequence = artifactPath(join(caseDir, "diagram-sequence.json"));
    artifactPaths.diagram_sequences = {};
    artifactPaths.preview = artifactPath(join(caseDir, "preview.json"));

    const profileSequences = Object.fromEntries(stage1ExecutorProfiles.map((executorProfile) => {
      const steps = selected.operations.map((operation, index) => createDiagramStep(operation, index + 1, {
        executorProfile,
        supportedExecutorProfiles: stage1ExecutorProfiles
      }));
      const sequence = createDiagramSequence(steps, { executorProfile });
      return [executorProfile, {
        steps,
        sequence,
        validation: steps.map((step) => validateExecutorReadableStep(step))
      }];
    }));
    const diagramStep = profileSequences["human-hand"].steps[0];
    const diagramSequence = profileSequences["human-hand"].sequence;
    diagramStepValidation = profileSequences["human-hand"].validation[0];
    diagramProfileValidation = Object.fromEntries(
      Object.entries(profileSequences).map(([executorProfile, value]) => [executorProfile, {
        ok: value.validation.every((result) => result.ok),
        steps: value.validation
      }])
    );
    executorReadable = selectedValidation.ok && Object.values(diagramProfileValidation).every((result) => result.ok);

    await writeFile(join(caseDir, "derived.fold"), serializeFold(selected.derived), "utf8");
    await writeFile(join(caseDir, "crease.svg"), createCreasePatternSvg(selected.derived), "utf8");
    await writeJson(join(caseDir, "validation.json"), selected.validation);
    await writeJson(join(caseDir, "diagram-step.json"), diagramStep);
    await writeJson(join(caseDir, "diagram-sequence.json"), diagramSequence);
    for (const [executorProfile, value] of Object.entries(profileSequences)) {
      const fileName = `diagram-sequence-${executorProfile}.json`;
      artifactPaths.diagram_sequences[executorProfile] = artifactPath(join(caseDir, fileName));
      await writeJson(join(caseDir, fileName), value.sequence);
    }
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
    claim_status: buildClaimStatus({ simulatorValid: selectedValidation.ok, executorReadable }),
    executor_readable: executorReadable,
    executor_profile: "human-hand",
    executor_profiles: stage1ExecutorProfiles,
    diagram_step_validation: diagramStepValidation,
    diagram_profile_validation: diagramProfileValidation,
    selected_candidate_id: selected?.candidate_id ?? null,
    validation_status: selectedValidation.ok,
    candidate_count: records.length,
    rejected_candidate_count: records.filter((record) => !record.validation.ok).length,
    selected_operation_count: selected?.operations.length ?? 0,
    candidate_operations: records.map((record) => ({
      candidate_id: record.candidate_id,
      operation_ids: record.operations.map((operation) => operation.id),
      operation_count: record.operations.length,
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
  const operations = normalizeOperations(candidateConfig);
  const derived = applyLocalFoldOperations(baseFold, operations);
  const validation = validateFold(derived);
  return {
    rank: index + 1,
    candidate_id: candidateConfig.id,
    rationale: candidateConfig.rationale,
    operation: cloneJson(operations[0]),
    operations: cloneJson(operations),
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
      operations: record.operations,
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
  const candidateOperation = operation(id, name, assignment, edge, rationale);
  return {
    id,
    score,
    rationale,
    operation: candidateOperation,
    operations: [candidateOperation]
  };
}

function invalidCandidate(id) {
  return candidate(id, "Reject out-of-range exploratory fold", "V", [0, 99], 0, "Records how invalid proposals are kept as pipeline data.");
}

function sequenceCandidate(id, name, operations, score, rationale) {
  return {
    id,
    name,
    score,
    rationale,
    operation: operations[0],
    operations
  };
}

function operation(id, name, assignment, edge, rationale) {
  return {
    id,
    name,
    assignment,
    edge,
    instruction: `${name}.`,
    rationale
  };
}

function normalizeOperations(candidateConfig) {
  if (Array.isArray(candidateConfig.operations) && candidateConfig.operations.length > 0) {
    return candidateConfig.operations;
  }
  if (candidateConfig.operation) {
    return [candidateConfig.operation];
  }
  throw new Error(`${candidateConfig.id}: missing operations`);
}

function buildClaimStatus({ simulatorValid, executorReadable }) {
  return {
    claim_label: simulatorValid && executorReadable
      ? "simulator-valid / executor-readable / embodiment-untested"
      : `${simulatorValid ? "simulator-valid" : "simulator-invalid"} / ${executorReadable ? "executor-readable" : "executor-unreadable"} / embodiment-untested`,
    simulator_valid: simulatorValid,
    executor_readable: executorReadable,
    embodiment_validated: false,
    embodiment_status: "untested",
    final_record_path: null
  };
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
