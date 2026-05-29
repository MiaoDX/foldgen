import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  applyLocalFoldOperation,
  createPreviewModel,
  loadFoldFile,
  stableStringify,
  validateFold
} from "../../fold-core/src/index.mjs";
import { stage1ExecutorProfiles, stage1SimpleTargetFiles, targetProfiles } from "./pipeline.mjs";

export async function runCriticBatch(options = {}) {
  const baseFormsDir = options.baseFormsDir ?? "benchmarks/base-forms";
  const targetsDir = options.targetsDir ?? "benchmarks/targets";
  const outDir = options.outDir ?? "out/m8-critic";
  const targetFiles = options.targetFiles ?? stage1SimpleTargetFiles;
  const metadata = JSON.parse(await readFile(join(targetsDir, "metadata.json"), "utf8"));
  const targets = selectTargets(metadata.targets, targetFiles);

  await mkdir(outDir, { recursive: true });

  const cases = await Promise.all(targets.map((target) => (
    runCriticCase({
      target,
      profile: targetProfiles[target.file],
      baseFormsDir,
      outDir
    })
  )));
  const ok = cases.length > 0 && cases.every((criticCase) => criticCase.status === "ranked");
  const summary = {
    milestone: "M8",
    ok,
    case_count: cases.length,
    evaluator: "deterministic-critic-v0",
    cases
  };
  await writeJson(join(outDir, "summary.json"), summary);
  return summary;
}

export async function runCriticCase({ target, profile, baseFormsDir, outDir }) {
  const caseDir = join(outDir, profile.caseId);
  await mkdir(caseDir, { recursive: true });

  const baseFold = await loadFoldFile(join(baseFormsDir, profile.baseForm));
  const entries = profile.candidates.map((candidate, index) => {
    const operation = normalizeOperations(candidate)[0];
    const derived = applyLocalFoldOperation(baseFold, operation);
    const validation = validateFold(derived);
    const preview = createPreviewModel(derived);
    return {
      candidate_id: candidate.id,
      operation,
      critic_result: evaluateCandidate({
        operation,
        validation,
        renderSummary: summarizePreview(preview),
        targetFeatures: profile.targetFeatures,
        priorScore: 0,
        rank: index + 1
      })
    };
  });
  const selected = selectBestCriticEntry(entries);
  const history = {
    type: "foldgen.critic_history.v1",
    evaluator: "deterministic-critic-v0",
    case_id: profile.caseId,
    target: {
      name: target.name,
      file: target.file
    },
    selected_base_form: profile.baseForm,
    target_features: profile.targetFeatures,
    entries: entries.map((entry) => ({
      candidate_id: entry.candidate_id,
      operation: entry.operation,
      selected: entry.candidate_id === selected?.candidate_id,
      ...entry.critic_result
    }))
  };
  await writeJson(join(caseDir, "critic-history.json"), history);

  const caseSummary = {
    case_id: profile.caseId,
    target: {
      name: target.name,
      file: target.file
    },
    status: selected ? "ranked" : "failed",
    selected_candidate_id: selected?.candidate_id ?? null,
    selected_score: selected?.critic_result.score ?? 0,
    rejected_candidate_count: entries.filter((entry) => entry.critic_result.verdict === "rejected-invalid").length,
    executor_profiles: stage1ExecutorProfiles,
    artifact_paths: {
      critic_history: toPosix(join(outDir, profile.caseId, "critic-history.json"))
    }
  };
  await writeJson(join(caseDir, "summary.json"), caseSummary);
  return caseSummary;
}

export function evaluateCandidate({ operation, validation, renderSummary, targetFeatures, priorScore = 0, rank = 1 }) {
  if (!validation.ok) {
    return {
      evaluator: "deterministic-critic-v0",
      score: 0,
      verdict: "rejected-invalid",
      score_components: {
        prior: round(priorScore),
        validity: 0,
        feature_match: 0,
        geometry: 0,
        rank_penalty: round(rank * -0.001)
      },
      feature_matches: [],
      reasons: validation.errors.length > 0 ? validation.errors : ["candidate failed structural validation"]
    };
  }

  const featureMatches = matchedFeatures(operation, targetFeatures);
  const scoreComponents = {
    prior: round(priorScore),
    validity: 1,
    feature_match: round(featureMatches.length * 0.25),
    geometry: round((renderSummary?.non_boundary_edge_count ?? 0) * 0.01),
    rank_penalty: round(rank * -0.001)
  };
  const score = round(Object.values(scoreComponents).reduce((sum, value) => sum + value, 0));
  return {
    evaluator: "deterministic-critic-v0",
    score,
    verdict: "ranked-valid",
    score_components: scoreComponents,
    feature_matches: featureMatches,
    reasons: [
      "candidate passed structural validation",
      featureMatches.length > 0
        ? `matched target features: ${featureMatches.join(", ")}`
        : "no direct target feature token matched",
      `preview geometry has ${renderSummary?.non_boundary_edge_count ?? 0} non-boundary edges`
    ]
  };
}

export function summarizePreview(preview) {
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

function selectBestCriticEntry(entries) {
  return entries
    .filter((entry) => entry.critic_result.verdict === "ranked-valid")
    .sort((a, b) => b.critic_result.score - a.critic_result.score || a.candidate_id.localeCompare(b.candidate_id))[0] ?? null;
}

function matchedFeatures(operation, targetFeatures) {
  const haystack = `${operation.id} ${operation.name} ${operation.rationale ?? ""}`.toLowerCase();
  return targetFeatures.filter((feature) => (
    feature.toLowerCase().split(/\W+/).filter(Boolean).some((token) => haystack.includes(token))
  ));
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

function toPosix(path) {
  return path.split("\\").join("/");
}

function round(value) {
  return Number(value.toFixed(4));
}
