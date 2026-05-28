import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import {
  applyLocalFoldOperation,
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
import { stage1ExecutorProfiles, targetProfiles } from "./pipeline.mjs";

export async function runLocalSearchBatch(options = {}) {
  const baseFormsDir = options.baseFormsDir ?? "benchmarks/base-forms";
  const targetsDir = options.targetsDir ?? "benchmarks/targets";
  const outDir = options.outDir ?? "out/m7-search";
  const targetFiles = options.targetFiles ?? Object.keys(targetProfiles);
  const metadata = JSON.parse(await readFile(join(targetsDir, "metadata.json"), "utf8"));
  const targets = selectTargets(metadata.targets, targetFiles);

  await mkdir(outDir, { recursive: true });

  const cases = await Promise.all(targets.map((target) => (
    runLocalSearchCase({
      target,
      profile: targetProfiles[target.file],
      baseFormsDir,
      targetsDir,
      outDir,
      maxIterations: options.maxIterations ?? 2,
      beamWidth: options.beamWidth ?? 3
    })
  )));
  const ok = cases.length > 0 && cases.every((searchCase) => searchCase.status === "valid" && searchCase.executor_readable);
  const summary = {
    milestone: "M7",
    ok,
    case_count: cases.length,
    strategy: "deterministic-local-search-v0",
    cases
  };
  await writeJson(join(outDir, "summary.json"), summary);
  return summary;
}

export async function runLocalSearchCase(options = {}) {
  const baseFormsDir = options.baseFormsDir ?? "benchmarks/base-forms";
  const targetsDir = options.targetsDir ?? "benchmarks/targets";
  const outDir = options.outDir ?? "out/m7-search";
  const target = options.target ?? await loadTargetMetadata(targetsDir, options.targetFile ?? "simple-bird.svg");
  const profile = options.profile ?? targetProfiles[target.file];
  if (!profile) {
    throw new Error(`${target.file}: missing target profile`);
  }

  const caseDir = join(outDir, profile.caseId);
  await mkdir(caseDir, { recursive: true });
  await readFile(join(targetsDir, target.file), "utf8");

  const baseFold = await loadFoldFile(join(baseFormsDir, profile.baseForm));
  const searchResult = searchOperationSequence(baseFold, profile, {
    maxIterations: options.maxIterations ?? 2,
    beamWidth: options.beamWidth ?? 3
  });
  const finalValidation = validateFold(searchResult.derived);
  const profileSequences = buildProfileSequences(searchResult.operations);
  const executorReadable = finalValidation.ok && Object.values(profileSequences).every((entry) => entry.ok);

  const artifactPaths = {
    derived_fold: artifactPath(join(caseDir, "derived.fold")),
    crease_svg: artifactPath(join(caseDir, "crease.svg")),
    preview: artifactPath(join(caseDir, "preview.json")),
    validation: artifactPath(join(caseDir, "validation.json")),
    search_history: artifactPath(join(caseDir, "search-history.json")),
    diagram_sequence: artifactPath(join(caseDir, "diagram-sequence.json")),
    diagram_sequences: {},
    case_summary: artifactPath(join(caseDir, "summary.json"))
  };

  await writeFile(join(caseDir, "derived.fold"), serializeFold(searchResult.derived), "utf8");
  await writeFile(join(caseDir, "crease.svg"), createCreasePatternSvg(searchResult.derived), "utf8");
  await writeJson(join(caseDir, "preview.json"), createPreviewModel(searchResult.derived));
  await writeJson(join(caseDir, "validation.json"), finalValidation);
  await writeJson(join(caseDir, "search-history.json"), searchResult.history);
  await writeJson(join(caseDir, "diagram-sequence.json"), profileSequences["human-hand"].sequence);
  for (const [executorProfile, entry] of Object.entries(profileSequences)) {
    const fileName = `diagram-sequence-${executorProfile}.json`;
    artifactPaths.diagram_sequences[executorProfile] = artifactPath(join(caseDir, fileName));
    await writeJson(join(caseDir, fileName), entry.sequence);
  }

  const caseSummary = {
    case_id: profile.caseId,
    target: {
      name: target.name,
      file: target.file
    },
    selected_base_form: profile.baseForm,
    status: finalValidation.ok ? "valid" : "failed",
    executor_readable: executorReadable,
    executor_profile: "human-hand",
    executor_profiles: stage1ExecutorProfiles,
    selected_operation_count: searchResult.operations.length,
    selected_operation_ids: searchResult.operations.map((operation) => operation.id),
    iteration_count: searchResult.history.iterations.length,
    search_status: searchResult.status,
    final_score: searchResult.score,
    validation_status: finalValidation.ok,
    artifact_paths: artifactPaths
  };
  await writeJson(join(caseDir, "summary.json"), caseSummary);
  return caseSummary;
}

export function searchOperationSequence(baseFold, profile, options = {}) {
  const maxIterations = options.maxIterations ?? 2;
  const beamWidth = options.beamWidth ?? 3;
  const candidatePool = buildOperationPool(profile);
  const selectedOperations = [];
  let currentFold = baseFold;
  let currentScore = 0;
  const history = {
    type: "foldgen.local_search_history.v1",
    strategy: "deterministic-local-search-v0",
    case_id: profile.caseId,
    selected_base_form: profile.baseForm,
    target_features: profile.targetFeatures,
    max_iterations: maxIterations,
    beam_width: beamWidth,
    iterations: []
  };

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const proposals = proposeOperations(candidatePool, selectedOperations, beamWidth);
    const records = proposals.map((operationProposal, index) => evaluateProposal({
      currentFold,
      operation: operationProposal,
      profile,
      targetFeatures: profile.targetFeatures,
      iteration,
      rank: index + 1,
      priorScore: currentScore
    }));
    const selected = selectBestSearchCandidate(records);
    if (!selected) {
      history.iterations.push({
        iteration,
        status: "blocked",
        proposals: records,
        selected_candidate_id: null
      });
      break;
    }

    selectedOperations.push(selected.operation);
    currentFold = selected.derived;
    currentScore = selected.score;
    history.iterations.push({
      iteration,
      status: "selected",
      proposals: records.map(toHistoryRecord),
      selected_candidate_id: selected.candidate_id,
      selected_operation_id: selected.operation.id,
      selected_score: selected.score
    });
  }

  return {
    status: selectedOperations.length === maxIterations ? "complete" : "partial",
    operations: selectedOperations.map(cloneJson),
    derived: currentFold,
    score: currentScore,
    history
  };
}

function buildProfileSequences(operations) {
  return Object.fromEntries(stage1ExecutorProfiles.map((executorProfile) => {
    const steps = operations.map((operation, index) => createDiagramStep(operation, index + 1, {
      executorProfile,
      supportedExecutorProfiles: stage1ExecutorProfiles
    }));
    const validation = steps.map((step) => validateExecutorReadableStep(step));
    return [executorProfile, {
      ok: validation.every((result) => result.ok),
      sequence: createDiagramSequence(steps, { executorProfile }),
      validation
    }];
  }));
}

function buildOperationPool(profile) {
  const seen = new Set();
  return profile.candidates
    .flatMap((candidate) => normalizeOperations(candidate))
    .filter((operation) => {
      if (seen.has(operation.id)) {
        return false;
      }
      seen.add(operation.id);
      return true;
    });
}

function proposeOperations(candidatePool, selectedOperations, beamWidth) {
  const selectedIds = new Set(selectedOperations.map((operation) => operation.id));
  return candidatePool
    .filter((operation) => !selectedIds.has(operation.id))
    .slice(0, beamWidth);
}

function evaluateProposal({ currentFold, operation, profile, targetFeatures, iteration, rank, priorScore }) {
  const derived = applyLocalFoldOperation(currentFold, operation);
  const validation = validateFold(derived);
  const preview = createPreviewModel(derived);
  const renderSummary = summarizePreview(preview);
  const featureMatches = matchedFeatures(operation, targetFeatures);
  const score = validation.ok
    ? round(priorScore + 1 + featureMatches.length * 0.25 + renderSummary.non_boundary_edge_count * 0.01 - rank * 0.001)
    : 0;
  return {
    candidate_id: `${profile.caseId}-iter${iteration}-${operation.id}`,
    operation: cloneJson(operation),
    validation,
    render_summary: renderSummary,
    feature_matches: featureMatches,
    score,
    selected: false,
    derived
  };
}

function toHistoryRecord(record) {
  return {
    candidate_id: record.candidate_id,
    operation: record.operation,
    validation_status: record.validation.ok ? "valid" : "invalid",
    validation_errors: record.validation.errors,
    render_summary: record.render_summary,
    feature_matches: record.feature_matches,
    score: record.score,
    selected: record.selected
  };
}

function selectBestSearchCandidate(records) {
  const selected = records
    .filter((record) => record.validation.ok)
    .sort((a, b) => b.score - a.score || a.candidate_id.localeCompare(b.candidate_id))[0] ?? null;
  if (selected) {
    selected.selected = true;
  }
  return selected;
}

function summarizePreview(preview) {
  const assignments = Object.fromEntries(["B", "M", "V", "F", "U"].map((assignment) => [assignment, 0]));
  for (const edge of preview.edges) {
    assignments[edge.assignment] = (assignments[edge.assignment] ?? 0) + 1;
  }
  return {
    type: preview.type,
    vertex_count: preview.vertices.length,
    edge_count: preview.edges.length,
    non_boundary_edge_count: preview.edges.filter((edge) => edge.assignment !== "B").length,
    assignments
  };
}

function matchedFeatures(operation, targetFeatures) {
  const haystack = `${operation.id} ${operation.name} ${operation.rationale ?? ""}`.toLowerCase();
  return targetFeatures.filter((feature) => (
    feature.toLowerCase().split(/\W+/).filter(Boolean).some((token) => haystack.includes(token))
  ));
}

async function loadTargetMetadata(targetsDir, targetFile) {
  const metadata = JSON.parse(await readFile(join(targetsDir, "metadata.json"), "utf8"));
  const target = metadata.targets.find((entry) => entry.file === targetFile);
  if (!target) {
    throw new Error(`${targetFile}: missing target metadata`);
  }
  return target;
}

function selectTargets(targets, targetFiles) {
  const byFile = new Map(targets.map((target) => [target.file, target]));
  return targetFiles.map((file) => {
    const target = byFile.get(file);
    if (!target) {
      throw new Error(`${file}: missing target metadata`);
    }
    if (!targetProfiles[file]) {
      throw new Error(`${file}: missing target profile`);
    }
    return target;
  });
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

async function writeJson(path, value) {
  await writeFile(path, `${stableStringify(value, 2)}\n`, "utf8");
}

function artifactPath(path) {
  return toPosix(relative(process.cwd(), path));
}

function toPosix(path) {
  return path.split("\\").join("/");
}

function round(value) {
  return Number(value.toFixed(4));
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}
