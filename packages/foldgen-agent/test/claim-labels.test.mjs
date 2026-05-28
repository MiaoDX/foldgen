import { mkdir, mkdtemp, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { createDiagramSequence, createDiagramStep, deterministicDemoOperation } from "../../fold-core/src/index.mjs";
import { stage1ExecutorProfiles, validateStage1ClaimLabels } from "../src/index.mjs";

test("claim label validator accepts Stage 1 executor-readable labels", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "foldgen-claim-labels-ok-"));
  try {
    await writeFixtureTree(rootDir, validSummary());
    const result = await validateStage1ClaimLabels({ rootDir });
    assert.equal(result.ok, true, result.errors.join("\n"));
    assert.equal(result.expected_case_label, "simulator-valid / executor-readable / embodiment-untested");
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("claim label validator rejects missing pipeline claim labels", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "foldgen-claim-labels-missing-"));
  try {
    const summary = validSummary();
    delete summary.cases[0].claim_status;
    await writeFixtureTree(rootDir, summary);
    const result = await validateStage1ClaimLabels({ rootDir });
    assert.equal(result.ok, false);
    assert.match(result.errors.join("\n"), /missing claim_status/);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("claim label validator rejects missing executor-readable evidence", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "foldgen-claim-labels-executor-missing-"));
  try {
    const summary = validSummary();
    summary.cases[0].artifact_paths.diagram_sequence = "out/m2-pipeline/simple-bird/missing.json";
    await writeFixtureTree(rootDir, summary);
    await unlink(join(rootDir, summary.cases[0].artifact_paths.diagram_sequence));
    const result = await validateStage1ClaimLabels({ rootDir });
    assert.equal(result.ok, false);
    assert.match(result.errors.join("\n"), /missing or invalid diagram sequence/);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("claim label validator rejects default physical-execution claims", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "foldgen-claim-labels-banned-"));
  try {
    await writeFixtureTree(rootDir, validSummary(), {
      readmeExtra: "\nClaim status: embodiment-validated\n"
    });
    const result = await validateStage1ClaimLabels({ rootDir });
    assert.equal(result.ok, false);
    assert.match(result.errors.join("\n"), /must not claim validation/);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

async function writeFixtureTree(rootDir, summary, options = {}) {
  await mkdir(join(rootDir, "demo"), { recursive: true });
  await mkdir(join(rootDir, "docs/blog"), { recursive: true });
  await mkdir(join(rootDir, "docs/launch"), { recursive: true });
  await mkdir(join(rootDir, "out/m2-pipeline"), { recursive: true });

  await writeFile(join(rootDir, "README.md"), [
    "simulator-valid / executor-readable / embodiment-untested",
    "npm run validate:stage1",
    "npm run validate:embodiment",
    options.readmeExtra ?? ""
  ].join("\n"), "utf8");
  await writeFile(join(rootDir, "demo/README.md"), [
    "simulator-valid / executor-readable / embodiment-untested",
    "does not call live model providers"
  ].join("\n"), "utf8");
  await writeFile(join(rootDir, "demo/app.js"), [
    "const claim_status = {};",
    "function formatClaimStatus(claimStatus) {",
    "  return claimStatus.claim_label;",
    "}",
    "function renderActionFlow(actions) { return actions.map((action) => action.text).join(); }",
    "function renderStep(step) { return step.executor_profile + renderActionFlow(step.actions); }"
  ].join("\n"), "utf8");
  await writeFile(join(rootDir, "docs/launch/stage-1-launch-checklist.md"), [
    "Draft-only",
    "npm run validate:stage1",
    "npm run validate:embodiment",
    "simulator-valid / executor-readable / embodiment-untested"
  ].join("\n"), "utf8");
  await writeFile(join(rootDir, "docs/blog/stage-1-mvp-draft.md"), [
    "Draft-only",
    "Related-work status",
    "simulator-valid / executor-readable / embodiment-untested"
  ].join("\n"), "utf8");
  await writeFile(join(rootDir, "out/m2-pipeline/summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  const sequence = createDiagramSequence([createDiagramStep(deterministicDemoOperation, 1)]);
  for (const pipelineCase of summary.cases) {
    const path = pipelineCase.artifact_paths.diagram_sequence;
    await mkdir(dirname(join(rootDir, path)), { recursive: true });
    await writeFile(join(rootDir, path), `${JSON.stringify(sequence, null, 2)}\n`, "utf8");
    for (const executorProfile of stage1ExecutorProfiles) {
      const profilePath = pipelineCase.artifact_paths.diagram_sequences[executorProfile];
      const profileSequence = createDiagramSequence([
        createDiagramStep(deterministicDemoOperation, 1, {
          executorProfile,
          supportedExecutorProfiles: stage1ExecutorProfiles
        })
      ], { executorProfile });
      await writeFile(join(rootDir, profilePath), `${JSON.stringify(profileSequence, null, 2)}\n`, "utf8");
    }
  }
}

function validSummary() {
  const cases = ["simple-bird", "simple-fish", "simple-flower", "simple-boat", "simple-star"].map((caseId) => ({
    case_id: caseId,
    status: "valid",
    validation_status: true,
    executor_readable: true,
    executor_profile: "human-hand",
    executor_profiles: stage1ExecutorProfiles,
    artifact_paths: {
      diagram_sequence: `out/m2-pipeline/${caseId}/diagram-sequence.json`,
      diagram_sequences: Object.fromEntries(
        stage1ExecutorProfiles.map((executorProfile) => [
          executorProfile,
          `out/m2-pipeline/${caseId}/diagram-sequence-${executorProfile}.json`
        ])
      )
    },
    claim_status: validClaimStatus()
  }));
  return {
    ok: true,
    case_count: cases.length,
    claim_status: validClaimStatus(),
    cases
  };
}

function validClaimStatus() {
  return {
    claim_label: "simulator-valid / executor-readable / embodiment-untested",
    simulator_valid: true,
    executor_readable: true,
    embodiment_validated: false,
    embodiment_status: "untested",
    final_record_path: null
  };
}
