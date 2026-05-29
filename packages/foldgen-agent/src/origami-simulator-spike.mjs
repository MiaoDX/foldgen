import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

import { parseFold, stableStringify } from "../../fold-core/src/index.mjs";
import { runCuratedPipeline } from "./pipeline.mjs";

const OFFICIAL_REPO_URL = "https://github.com/amandaghassaei/OrigamiSimulator";
const OFFICIAL_APP_URL = "https://origamisimulator.org/";
const REQUIRED_IMPORT_FIELDS = ["vertices_coords", "edges_vertices", "edges_assignment", "faces_vertices"];
const FOLD_PERCENTS = [0, 50, 100];

export async function runOrigamiSimulatorAdapterSpike(options = {}) {
  const outDir = options.outDir ?? "out/m19-origami-simulator-spike";
  const caseId = options.caseId ?? "simple-fish";
  const pipelineOutDir = join(outDir, "pipeline");
  await mkdir(outDir, { recursive: true });

  const summary = await runCuratedPipeline({ outDir: pipelineOutDir });
  const pipelineCase = summary.cases.find((candidate) => candidate.case_id === caseId);
  if (!pipelineCase) {
    throw new Error(`${caseId}: missing pipeline case for Origami Simulator spike`);
  }

  const caseDir = join(outDir, caseId);
  const framesDir = join(caseDir, "progressive-input-frames");
  await mkdir(framesDir, { recursive: true });

  const simulatorFoldPath = join(process.cwd(), pipelineCase.artifact_paths.origami_simulator_fold.replace(`${pipelineOutDir}/`, `${pipelineOutDir}/`));
  const simulatorFold = parseFold(await readFile(simulatorFoldPath, "utf8"), simulatorFoldPath);
  const importCompatibility = validateOrigamiSimulatorImportFold(simulatorFold);
  const progressiveFrames = await writeProgressiveInputFrames({
    simulatorFold,
    framesDir,
    sourcePath: simulatorFoldPath
  });
  const frameComparison = compareProgressiveFrames(progressiveFrames);

  const canClaimAutomatedBackend = false;
  const record = {
    type: "foldgen.origami_simulator_spike.v1",
    adapter_id: "origami-simulator-adapter-spike",
    tool_name: "Origami Simulator",
    tool_version: "web-app-main",
    official_app_url: OFFICIAL_APP_URL,
    official_repo_url: OFFICIAL_REPO_URL,
    license: "MIT",
    case_id: caseId,
    status: canClaimAutomatedBackend ? "passed-progressive-state-backend" : "blocked-automated-state-export",
    decision: canClaimAutomatedBackend ? "promote-to-progressive-state-backend" : "manual-fixture-tool-only",
    input_artifact_path: toRepoPath(simulatorFoldPath),
    output_artifact_paths: progressiveFrames.map((frame) => frame.path),
    backend_state_artifacts: [],
    import_compatibility: importCompatibility,
    progressive_input_frames: {
      status: frameComparison.changed_frame_count >= 2 ? "generated" : "failed",
      fold_percents: FOLD_PERCENTS,
      frame_count: progressiveFrames.length,
      changed_frame_count: frameComparison.changed_frame_count,
      max_angle_delta: frameComparison.max_angle_delta,
      frames: progressiveFrames.map((frame) => ({
        fold_percent: frame.fold_percent,
        path: frame.path,
        nonzero_fold_angle_count: frame.nonzero_fold_angle_count
      }))
    },
    automated_backend: {
      status: "blocked",
      blocker: "No isolated local Node/headless adapter currently drives Origami Simulator's browser WebGL solver and exports intermediate folded-state FOLD/OBJ artifacts deterministically.",
      evidence: [
        "The official app supports FOLD import, a Fold Percent control, and manual FOLD/OBJ export.",
        "The current repo can generate compatible input FOLD files with edges_foldAngle, but those are simulator inputs, not solved backend states.",
        "No production dependency or local package in this repo exposes the official simulator solver as a deterministic Node API."
      ],
      required_to_unblock: [
        "Add an isolated browser automation adapter that imports a FOLD file, drives Fold Percent, waits for solver convergence, and exports FOLD/OBJ states.",
        "Or import licensed tutorial/simulator state fixtures with per-step pre/post folded-state artifacts."
      ]
    },
    claim_effect: "Does not satisfy completed-usable walkthrough evidence. Use as import/export spike evidence only.",
    next_route: "Switch Phase 14 Slice C/D to known-good tutorial state fixtures unless a real browser automation adapter is added."
  };

  await writeJson(join(caseDir, "origami-simulator-adapter-spike.json"), record);
  await writeJson(join(outDir, "summary.json"), {
    ok: record.status === "passed-progressive-state-backend" || record.status === "blocked-automated-state-export",
    status: record.status,
    decision: record.decision,
    case_id: caseId,
    record_path: toRepoPath(join(caseDir, "origami-simulator-adapter-spike.json")),
    claim_effect: record.claim_effect,
    next_route: record.next_route
  });
  return record;
}

export function validateOrigamiSimulatorImportFold(fold) {
  const errors = [];
  for (const field of REQUIRED_IMPORT_FIELDS) {
    if (!Array.isArray(fold[field])) {
      errors.push(`${field} is required for Origami Simulator FOLD import`);
    }
  }
  if (!Array.isArray(fold.edges_foldAngle)) {
    errors.push("edges_foldAngle is required for deterministic Fold Percent input frames");
  }
  if (Array.isArray(fold.edges_assignment) && Array.isArray(fold.edges_foldAngle)) {
    fold.edges_assignment.forEach((assignment, index) => {
      const angle = fold.edges_foldAngle[index];
      if (angle == null || assignment === "B" || assignment === "F" || assignment === "U") {
        return;
      }
      if (assignment === "V" && angle < 0) {
        errors.push(`edges_foldAngle[${index}] sign must be positive for valley folds`);
      }
      if (assignment === "M" && angle > 0) {
        errors.push(`edges_foldAngle[${index}] sign must be negative for mountain folds`);
      }
      if (Math.abs(angle) > 180) {
        errors.push(`edges_foldAngle[${index}] must be between -180 and 180`);
      }
    });
  }
  return {
    status: errors.length === 0 ? "passed" : "failed",
    required_fields: REQUIRED_IMPORT_FIELDS,
    optional_fields_checked: ["edges_foldAngle"],
    errors
  };
}

async function writeProgressiveInputFrames({ simulatorFold, framesDir, sourcePath }) {
  const frames = [];
  for (const foldPercent of FOLD_PERCENTS) {
    const scale = foldPercent / 100;
    const frameFold = {
      ...simulatorFold,
      file_title: `${simulatorFold.file_title ?? "foldgen"} - Origami Simulator input ${foldPercent}%`,
      edges_foldAngle: (simulatorFold.edges_foldAngle ?? []).map((angle) => (
        typeof angle === "number" ? round(angle * scale) : angle
      )),
      foldgen_origami_simulator_spike: {
        source_artifact_path: toRepoPath(sourcePath),
        fold_percent: foldPercent,
        status: "input-frame-not-simulated-state"
      }
    };
    const outputPath = join(framesDir, `fold-percent-${foldPercent}.fold`);
    await writeJson(outputPath, frameFold);
    frames.push({
      fold_percent: foldPercent,
      path: toRepoPath(outputPath),
      edges_foldAngle: frameFold.edges_foldAngle,
      nonzero_fold_angle_count: frameFold.edges_foldAngle.filter((angle) => typeof angle === "number" && Math.abs(angle) > 0.0001).length
    });
  }
  return frames;
}

function compareProgressiveFrames(frames) {
  let changedFrameCount = 0;
  let maxAngleDelta = 0;
  for (let index = 1; index < frames.length; index += 1) {
    const previous = frames[index - 1].edges_foldAngle;
    const current = frames[index].edges_foldAngle;
    let changed = false;
    for (let angleIndex = 0; angleIndex < Math.max(previous.length, current.length); angleIndex += 1) {
      const delta = Math.abs((current[angleIndex] ?? 0) - (previous[angleIndex] ?? 0));
      if (delta > 0.0001) {
        changed = true;
        maxAngleDelta = Math.max(maxAngleDelta, delta);
      }
    }
    if (changed) {
      changedFrameCount += 1;
    }
  }
  return {
    changed_frame_count: changedFrameCount,
    max_angle_delta: round(maxAngleDelta)
  };
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${stableStringify(value, 2)}\n`, "utf8");
}

function toRepoPath(path) {
  return relative(process.cwd(), path).split("\\").join("/");
}

function round(value) {
  return Number(value.toFixed(4));
}
