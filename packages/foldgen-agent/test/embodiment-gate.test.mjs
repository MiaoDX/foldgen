import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { validateEmbodimentGate } from "../src/index.mjs";

test("embodiment gate blocks when records are missing", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "foldgen-embodiment-empty-"));
  try {
    const result = await validateEmbodimentGate({ recordsDir: join(outDir, "attempts") });
    assert.equal(result.ok, false);
    assert.equal(result.status, "blocked");
    assert.equal(result.record_count, 0);
    assert.match(result.errors.join("\n"), /requires 5 passing/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test("embodiment gate passes with five passing claim-allowed records", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "foldgen-embodiment-pass-"));
  const recordsDir = join(outDir, "attempts");
  try {
    await mkdir(recordsDir, { recursive: true });
    const caseIds = ["simple-bird", "simple-fish", "simple-flower", "simple-boat", "simple-star"];
    for (const [index, caseId] of caseIds.entries()) {
      const executorType = index === 0 ? "human-hand" : "robot-gripper";
      await writeRecord(recordsDir, `${caseId}.json`, validRecord({
        case_id: caseId,
        executor_type: executorType,
        executor_label: `${executorType}-${index + 1}`
      }));
    }

    const result = await validateEmbodimentGate({ recordsDir });
    assert.equal(result.ok, true);
    assert.equal(result.passing_claim_allowed_record_count, 5);
    assert.deepEqual(result.cases_with_passing_records, caseIds);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test("embodiment gate rejects failed attempts marked claim allowed", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "foldgen-embodiment-invalid-"));
  const recordsDir = join(outDir, "attempts");
  try {
    await mkdir(recordsDir, { recursive: true });
    await writeRecord(recordsDir, "bad.json", validRecord({ status: "fail", claim_allowed: true }));

    const result = await validateEmbodimentGate({ recordsDir });
    assert.equal(result.ok, false);
    assert.match(result.errors.join("\n"), /claim_allowed can only be true/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

function validRecord(overrides = {}) {
  return {
    case_id: "simple-bird",
    artifact_summary: "out/m2-pipeline/simple-bird/summary.json",
    executor_type: "robot-gripper",
    executor_label: "lab-gripper-a",
    attempted_on: "2026-05-28",
    status: "pass",
    time_minutes: 12,
    notes: ["Folded from the generated step without extra instructions."],
    claim_allowed: true,
    ...overrides
  };
}

async function writeRecord(recordsDir, file, record) {
  await writeFile(join(recordsDir, file), `${JSON.stringify(record, null, 2)}\n`, "utf8");
}
