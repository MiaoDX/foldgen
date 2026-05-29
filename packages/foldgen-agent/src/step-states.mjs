import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

import {
  applyLocalFoldOperations,
  createPreviewModel,
  parseFold,
  serializeFold,
  stableStringify
} from "../../fold-core/src/index.mjs";

import { createFlatFolderStateArtifact } from "./community-adapters.mjs";

export async function createStepStateArtifacts({ caseDir, baseFold, operations, completedTarget }) {
  const stepStatesDir = join(caseDir, "step-states");
  await mkdir(stepStatesDir, { recursive: true });
  const states = [];
  let previousReferencePreview = createPreviewModel(baseFold);
  let previousStateFold = baseFold;

  for (let index = 0; index < operations.length; index += 1) {
    const stepNumber = index + 1;
    const prefixOperations = operations.slice(0, stepNumber);
    const prefixFold = applyLocalFoldOperations(baseFold, prefixOperations);
    const preStatePath = join(stepStatesDir, `step-${stepNumber}-pre.fold`);
    const inputPath = join(stepStatesDir, `step-${stepNumber}.fold`);
    const statePath = join(stepStatesDir, `step-${stepNumber}-solver-state.json`);
    const foldedPath = join(stepStatesDir, `step-${stepNumber}-folded.fold`);
    await writeFile(preStatePath, serializeFold(previousStateFold), "utf8");
    await writeFile(inputPath, serializeFold(prefixFold), "utf8");
    const solverState = await createFlatFolderStateArtifact(inputPath, statePath, foldedPath);
    const preview = createPreviewModel(prefixFold);
    const foldedPreview = solverState.status === "passed"
      ? createFoldedStatePreviewModel(parseFold(await readFile(foldedPath, "utf8"), foldedPath))
      : null;
    const frameDifference = computeFrameDifference(previousReferencePreview, foldedPreview);
    states.push({
      step: stepNumber,
      operation_id: operations[index].id,
      status: solverState.status === "passed" ? "solver-backed-post-state" : "inspection-only",
      required_for_completed_walkthrough: completedTarget === true,
      pre_state_fold_path: artifactPath(preStatePath),
      input_fold_path: artifactPath(inputPath),
      solver_state_path: artifactPath(statePath),
      folded_state_path: solverState.status === "passed" ? artifactPath(foldedPath) : null,
      solver_state: summarizeStepSolverState(solverState),
      preview,
      folded_preview: foldedPreview,
      frame_difference: frameDifference,
      limitations: solverState.status === "passed"
        ? []
        : ["Flat-Folder could not solve this intermediate prefix; the step visual remains inspection-only."]
    });
    previousReferencePreview = foldedPreview ?? preview;
    previousStateFold = solverState.status === "passed"
      ? parseFold(await readFile(foldedPath, "utf8"), foldedPath)
      : prefixFold;
  }

  const solverBackedCount = states.filter((state) => state.status === "solver-backed-post-state").length;
  const result = {
    type: "foldgen.step_states.v1",
    status: solverBackedCount === states.length
      ? "complete"
      : solverBackedCount > 0 ? "partial" : "inspection-only",
    case_id: caseDir.split("/").at(-1),
    step_count: operations.length,
    solver_backed_step_count: solverBackedCount,
    inspection_only_step_count: states.length - solverBackedCount,
    states: states.map((state) => ({
      ...state,
      preview: undefined,
      folded_preview: undefined
    }))
  };
  const outputPath = join(caseDir, "step-states.json");
  await writeJson(outputPath, result);
  return {
    ...result,
    output_path: artifactPath(outputPath),
    states
  };
}

export function createFoldedStatePreviewModel(foldedStateFold) {
  const vertices = (foldedStateFold.vertices_coords ?? []).map(([x, y], index) => ({
    index,
    x,
    y,
    z: zForFoldedVertex(index, foldedStateFold)
  }));
  const edges = (foldedStateFold.edges_vertices ?? []).map(([a, b], index) => ({
    index,
    vertices: [a, b],
    assignment: foldedStateFold.edges_assignment?.[index] ?? "U",
    lift: 0
  }));
  const faces = (foldedStateFold.faces_vertices ?? []).map((face, index) => ({
    index,
    vertices: [...face],
    average_z: round(face.reduce((total, vertexIndex) => total + (vertices[vertexIndex]?.z ?? 0), 0) / Math.max(face.length, 1))
  }));
  return {
    type: "foldgen.preview.v1",
    title: foldedStateFold.file_title ?? "solver-backed folded step state",
    projection: "flat-folder-folded-state",
    vertices: vertices.map((vertex) => ({
      index: vertex.index,
      x: round(vertex.x),
      y: round(vertex.y),
      z: round(vertex.z)
    })),
    edges,
    faces
  };
}

export function computeFrameDifference(previousPreview, nextPreview) {
  if (!nextPreview) {
    return {
      status: "missing-post-state",
      max_vertex_delta: 0,
      changed_vertex_count: 0
    };
  }
  if (!previousPreview) {
    return {
      status: "first-solver-backed-state",
      max_vertex_delta: 0,
      changed_vertex_count: 0
    };
  }
  const previous = new Map((previousPreview.vertices ?? []).map((vertex) => [vertex.index, vertex]));
  let maxVertexDelta = 0;
  let changedVertexCount = 0;
  for (const vertex of nextPreview.vertices ?? []) {
    const before = previous.get(vertex.index);
    if (!before) {
      changedVertexCount += 1;
      maxVertexDelta = Math.max(maxVertexDelta, 1);
      continue;
    }
    const delta = Math.hypot(
      (vertex.x ?? 0) - (before.x ?? 0),
      (vertex.y ?? 0) - (before.y ?? 0),
      (vertex.z ?? 0) - (before.z ?? 0)
    );
    if (delta > 0.0001) {
      changedVertexCount += 1;
      maxVertexDelta = Math.max(maxVertexDelta, delta);
    }
  }
  return {
    status: changedVertexCount > 0 ? "changed" : "unchanged",
    max_vertex_delta: round(maxVertexDelta),
    changed_vertex_count: changedVertexCount
  };
}

function summarizeStepSolverState(solverState) {
  return {
    status: solverState.status,
    state_count: solverState.state_count ?? 0,
    component_count: solverState.component_count ?? 0,
    face_order_count: solverState.face_order_count ?? 0,
    folded_vertex_count: solverState.folded_vertex_count ?? 0,
    conflict: solverState.conflict ?? null,
    errors: solverState.errors ?? []
  };
}

function zForFoldedVertex(vertexIndex, foldedStateFold) {
  const faceOrders = foldedStateFold.faceOrders ?? [];
  const faces = foldedStateFold.faces_vertices ?? [];
  const relatedFaceIndexes = faces
    .map((face, index) => face.includes(vertexIndex) ? index : null)
    .filter((index) => index !== null);
  if (relatedFaceIndexes.length === 0) {
    return 0;
  }
  const score = faceOrders.reduce((total, [a, b, order]) => {
    if (relatedFaceIndexes.includes(a)) {
      return total + order;
    }
    if (relatedFaceIndexes.includes(b)) {
      return total - order;
    }
    return total;
  }, 0);
  return score * 0.01;
}

async function writeJson(path, value) {
  await writeFile(path, `${stableStringify(value, 2)}\n`, "utf8");
}

function artifactPath(path) {
  return relative(process.cwd(), path).split("\\").join("/");
}

function round(value) {
  return Number(value.toFixed(4));
}
