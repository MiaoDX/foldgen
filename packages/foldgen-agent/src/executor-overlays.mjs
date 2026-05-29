import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

import { stableStringify } from "../../fold-core/src/index.mjs";

export async function writeExecutorOverlayArtifacts({ caseDir, caseId, stepVisuals, executorProfiles }) {
  const rootDir = join(caseDir, "executor-overlays");
  const profileSummaries = [];
  const artifactPaths = {};

  for (const profile of executorProfiles) {
    const steps = stepVisuals.profile_steps?.[profile] ?? [];
    artifactPaths[profile] = [];
    const stepSummaries = [];
    for (const step of steps) {
      const overlay = buildOverlayArtifact({ caseId, profile, step });
      const outputPath = join(rootDir, profile, `step-${step.step}.json`);
      await writeJson(outputPath, overlay);
      const repoPath = toRepoPath(outputPath);
      artifactPaths[profile].push(repoPath);
      step.executor_overlay_artifact_path = repoPath;
      stepSummaries.push({
        step: step.step,
        operation_id: step.operation_id,
        status: overlay.status,
        path: repoPath,
        zone_count: overlay.zones.length,
        geometry_bound: overlay.geometry_bound
      });
    }
    profileSummaries.push({
      profile,
      status: stepSummaries.length === stepVisuals.step_count && stepSummaries.every((step) => step.geometry_bound && step.zone_count > 0)
        ? "complete"
        : "incomplete",
      step_count: stepSummaries.length,
      required_step_count: stepVisuals.step_count,
      steps: stepSummaries
    });
  }

  const summary = {
    type: "foldgen.executor_overlays.v1",
    case_id: caseId,
    status: profileSummaries.every((profile) => profile.status === "complete") ? "complete" : "incomplete",
    profile_count: profileSummaries.length,
    step_count: stepVisuals.step_count,
    profiles: profileSummaries,
    artifact_paths: artifactPaths
  };
  const summaryPath = join(rootDir, "executor-overlays.json");
  await writeJson(summaryPath, summary);
  return {
    ...summary,
    output_path: toRepoPath(summaryPath)
  };
}

export function buildOverlayArtifact({ caseId, profile, step }) {
  const overlay = step.executor_overlay ?? {};
  const operationId = step.operation_id ?? null;
  const geometryBound = overlay.geometry_binding?.operation_id === operationId
    && Array.isArray(overlay.zones)
    && overlay.zones.length > 0;
  return {
    type: "foldgen.executor_overlay_artifact.v1",
    case_id: caseId,
    profile,
    step: step.step,
    operation_id: operationId,
    status: overlay.status ?? "missing",
    geometry_bound: geometryBound,
    geometry_binding: overlay.geometry_binding ?? null,
    zones: overlay.zones ?? [],
    unsupported_actions: overlay.unsupported_actions ?? [],
    contact_primitives: overlay.contact_primitives ?? [],
    display_source: step.display_source,
    step_state_path: step.step_state_path ?? null,
    folded_state_path: step.folded_state_path ?? null,
    claim_effect: geometryBound
      ? "supports executor-overlay gate for this profile and step"
      : "blocks executor-overlay gate for this profile and step"
  };
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${stableStringify(value, 2)}\n`, "utf8");
}

function toRepoPath(path) {
  return relative(process.cwd(), path).split("\\").join("/");
}
