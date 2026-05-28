import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { validateStage1ClaimLabels } from "../src/index.mjs";

test("claim label validator accepts Stage 1 untested labels", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "foldgen-claim-labels-ok-"));
  try {
    await writeFixtureTree(rootDir, validSummary());
    const result = await validateStage1ClaimLabels({ rootDir });
    assert.equal(result.ok, true, result.errors.join("\n"));
    assert.equal(result.expected_case_label, "simulator-valid / embodiment-untested");
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
    "simulator-valid / embodiment-untested",
    "npm run validate:stage1",
    "npm run validate:embodiment",
    options.readmeExtra ?? ""
  ].join("\n"), "utf8");
  await writeFile(join(rootDir, "demo/README.md"), [
    "simulator-valid / embodiment-untested",
    "does not call live model providers"
  ].join("\n"), "utf8");
  await writeFile(join(rootDir, "demo/app.js"), [
    "const claim_status = {};",
    "function formatClaimStatus(claimStatus) {",
    "  return claimStatus.claim_label;",
    "}"
  ].join("\n"), "utf8");
  await writeFile(join(rootDir, "docs/launch/stage-1-launch-checklist.md"), [
    "Draft-only",
    "npm run validate:stage1",
    "npm run validate:embodiment",
    "simulator-valid / embodiment-untested"
  ].join("\n"), "utf8");
  await writeFile(join(rootDir, "docs/blog/stage-1-mvp-draft.md"), [
    "Draft-only",
    "Related-work status",
    "simulator-valid / embodiment-untested"
  ].join("\n"), "utf8");
  await writeFile(join(rootDir, "out/m2-pipeline/summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}

function validSummary() {
  const cases = ["simple-bird", "simple-fish", "simple-flower", "simple-boat", "simple-star"].map((caseId) => ({
    case_id: caseId,
    status: "valid",
    validation_status: true,
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
    claim_label: "simulator-valid / embodiment-untested",
    simulator_valid: true,
    embodiment_validated: false,
    embodiment_status: "untested",
    final_record_path: null
  };
}
