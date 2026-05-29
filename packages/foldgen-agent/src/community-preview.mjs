import { readFile, writeFile } from "node:fs/promises";
import { relative } from "node:path";

import { parseFold, stableStringify } from "../../fold-core/src/index.mjs";

const ORIGAMI_SIMULATOR_URL = "https://origamisimulator.org/";
const REQUIRED_ORIGAMI_SIMULATOR_FIELDS = ["vertices_coords", "edges_vertices", "edges_assignment", "faces_vertices"];

export async function createOrigamiSimulatorExport(inputPath, outputFoldPath, outputRecordPath) {
  const fold = parseFold(await readFile(inputPath, "utf8"), inputPath);
  const errors = [];
  const warnings = [];
  for (const field of REQUIRED_ORIGAMI_SIMULATOR_FIELDS) {
    if (!Array.isArray(fold[field])) {
      errors.push(`${field} is required for Origami Simulator FOLD import`);
    }
  }

  const simulatorFold = toOrigamiSimulatorFold(fold);
  if (!Array.isArray(fold.edges_foldAngle)) {
    warnings.push("edges_foldAngle was missing; generated target fold angles from edges_assignment");
  }

  await writeFile(outputFoldPath, `${stableStringify(simulatorFold, 2)}\n`, "utf8");
  const record = {
    adapter_id: "origami-simulator-preview",
    tool_name: "Origami Simulator",
    tool_version: "web",
    import_url: ORIGAMI_SIMULATOR_URL,
    input_artifact_path: toRepoPath(inputPath),
    output_artifact_paths: [toRepoPath(outputFoldPath)],
    status: errors.length === 0 ? "passed" : "failed",
    required_fields: REQUIRED_ORIGAMI_SIMULATOR_FIELDS,
    optional_fields_added: ["edges_foldAngle"],
    errors,
    warnings,
    claim_effect: errors.length === 0
      ? "exports a community preview route; does not prove solver validity or embodiment"
      : "community preview export failed; no external preview claim",
    instructions: [
      "Open Origami Simulator.",
      "Import the generated origami-simulator.fold file.",
      "Use Fold Percent to inspect simultaneous crease folding."
    ]
  };
  await writeFile(outputRecordPath, `${stableStringify(record, 2)}\n`, "utf8");
  return record;
}

export function summarizeCommunityPreview(result) {
  if (!result) {
    return {
      adapter_id: "origami-simulator-preview",
      tool_name: "Origami Simulator",
      tool_version: "web",
      status: "unsupported",
      result_path: null,
      errors: [],
      warnings: ["community preview export has not run for this case"],
      claim_effect: "no community preview route"
    };
  }
  return {
    adapter_id: result.adapter_id,
    tool_name: result.tool_name,
    tool_version: result.tool_version,
    status: result.status,
    result_path: result.output_artifact_paths?.[0] ?? null,
    import_url: result.import_url,
    errors: result.errors ?? [],
    warnings: result.warnings ?? [],
    claim_effect: result.claim_effect
  };
}

function toOrigamiSimulatorFold(fold) {
  return {
    file_spec: 1,
    file_creator: "foldgen",
    file_title: fold.file_title ?? "foldgen Origami Simulator export",
    file_classes: ["singleModel"],
    frame_classes: ["creasePattern"],
    vertices_coords: fold.vertices_coords,
    edges_vertices: fold.edges_vertices,
    edges_assignment: fold.edges_assignment,
    edges_foldAngle: fold.edges_foldAngle ?? (fold.edges_assignment ?? []).map(foldAngleForAssignment),
    faces_vertices: fold.faces_vertices,
    foldgen_source: {
      source_file_title: fold.file_title ?? null,
      source_history: fold.foldgen_history ?? []
    }
  };
}

function foldAngleForAssignment(assignment) {
  switch (assignment) {
    case "V":
      return 180;
    case "M":
      return -180;
    case "F":
    case "B":
      return 0;
    default:
      return null;
  }
}

function toRepoPath(path) {
  return relative(process.cwd(), path).split("\\").join("/");
}
