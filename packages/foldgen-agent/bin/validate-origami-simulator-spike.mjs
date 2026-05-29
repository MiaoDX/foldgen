#!/usr/bin/env node
import { readFile } from "node:fs/promises";

import { runOrigamiSimulatorAdapterSpike } from "../src/index.mjs";

const outDir = process.argv[2] ?? "out/m19-origami-simulator-spike";

try {
  const record = await runOrigamiSimulatorAdapterSpike({ outDir });
  const errors = [];

  if (record.import_compatibility.status !== "passed") {
    errors.push("Origami Simulator import compatibility must pass for the spike fixture");
  }
  if (record.progressive_input_frames.status !== "generated") {
    errors.push("progressive input frames must be generated");
  }
  if (record.progressive_input_frames.changed_frame_count < 2) {
    errors.push("expected at least two changed fold-percent frame transitions");
  }
  if (record.status !== "blocked-automated-state-export") {
    errors.push(`expected automated backend to be blocked until solved state export exists, got ${record.status}`);
  }
  if (record.backend_state_artifacts.length !== 0) {
    errors.push("spike must not claim backend state artifacts from generated input frames");
  }
  if (!record.automated_backend?.blocker) {
    errors.push("blocked adapter record must include a concrete blocker");
  }
  for (const frame of record.progressive_input_frames.frames) {
    const artifact = JSON.parse(await readFile(frame.path, "utf8"));
    if (artifact.foldgen_origami_simulator_spike?.status !== "input-frame-not-simulated-state") {
      errors.push(`${frame.path}: progressive frame must be marked as input-frame-not-simulated-state`);
    }
  }

  const result = {
    ok: errors.length === 0,
    outDir,
    status: record.status,
    decision: record.decision,
    case_id: record.case_id,
    progressive_input_frames: record.progressive_input_frames,
    automated_backend: record.automated_backend,
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
