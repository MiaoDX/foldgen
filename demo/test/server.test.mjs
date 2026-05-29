import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

import { runCuratedPipeline } from "../../packages/foldgen-agent/src/index.mjs";
import { createDemoServer } from "../server.mjs";

test("demo server serves app shell and local pipeline artifacts", async () => {
  await runCuratedPipeline({ outDir: "out/m2-pipeline" });
  const server = createDemoServer({ root: process.cwd() });
  await listen(server);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const html = await fetchText(`${baseUrl}/demo/`);
    assert.match(html, /id="app-shell"/);
    assert.match(html, /id="target-select"/);
    assert.match(html, /id="profile-select"/);
    assert.match(html, /id="image-upload"/);
    assert.match(html, /id="preview-canvas"/);
    assert.match(html, /id="step-diagram"/);
    assert.match(html, /id="step-preview-canvas"/);
    assert.match(html, /id="executor-image"/);
    assert.match(html, /id="downloads"/);
    assert.match(html, /id="embodiment-status"/);
    assert.match(html, /id="validation-status"/);
    assert.match(html, /id="instruction-label"/);

    const script = await fetchText(`${baseUrl}/demo/app.js`);
    assert.match(script, /fetchCaseArtifacts/);
    assert.match(script, /pageParams/);
    assert.match(script, /formatClaimStatus/);
    assert.match(script, /claim_status/);
    assert.match(script, /executor_profile/);
    assert.match(script, /renderActionFlow/);
    assert.match(script, /previewAnimation/);
    assert.match(script, /renderValidationStatus/);
    assert.match(script, /renderWalkthrough/);
    assert.match(script, /renderExecutorImage/);
    assert.match(script, /drawPreviewFaces/);
    assert.match(script, /community_fold_validation/);
    assert.match(script, /flat_folder_validation/);
    assert.match(script, /drawPreviewFrame/);

    const summary = await fetchJson(`${baseUrl}/out/m2-pipeline/summary.json`);
    assert.equal(summary.ok, true);
    assert.equal(summary.case_count, 5);
    assert.equal(summary.claim_status.claim_label, "simulator-valid / executor-readable / embodiment-untested");
    assert.equal(summary.claim_status.executor_readable, true);

    const firstCase = summary.cases[0];
    assert.equal(firstCase.executor_readable, true);
    assert.deepEqual(firstCase.executor_profiles, ["human-hand", "two-finger-gripper", "cat-paw-profile", "dog-paw-profile"]);
    assert.equal(firstCase.selected_operation_count > 1, true);
    assert.equal(firstCase.external_validation.community_fold.status, "passed");
    assert.equal(firstCase.external_validation.flat_folder.status, "failed");
    assert.ok(firstCase.artifact_paths.step_visuals);
    const sequence = await fetchJson(`${baseUrl}/${firstCase.artifact_paths.diagram_sequence}`);
    assert.equal(sequence.step_count, firstCase.selected_operation_count);
    assert.equal(sequence.steps.length, firstCase.selected_operation_count);
    assert.equal(sequence.steps[0].executor_profile, "human-hand");
    assert.ok(sequence.steps[0].actions.some((action) => action.phase === "align"));
    const dogSequence = await fetchJson(`${baseUrl}/${firstCase.artifact_paths.diagram_sequences["dog-paw-profile"]}`);
    assert.equal(dogSequence.steps[0].executor_profile, "dog-paw-profile");
    assert.equal(dogSequence.step_count, firstCase.selected_operation_count);
    assert.ok(dogSequence.executor_visual_metadata.contact_zones.length > 0);
    assert.equal(dogSequence.executor_visual_metadata.instruction_label, "template executor instructions");
    assert.match(dogSequence.executor_visual_metadata.visual_asset_path, /demo\/assets\/executors\/dog-paw-profile\.png/);

    const communityFold = await fetchJson(`${baseUrl}/${firstCase.artifact_paths.community_fold_validation}`);
    assert.equal(communityFold.status, "passed");
    const flatFolder = await fetchJson(`${baseUrl}/${firstCase.artifact_paths.flat_folder_validation}`);
    assert.equal(flatFolder.status, "failed");
    const simulatorPreview = await fetchJson(`${baseUrl}/${firstCase.artifact_paths.origami_simulator_preview}`);
    assert.equal(simulatorPreview.status, "passed");
    assert.match(simulatorPreview.import_url, /origamisimulator/);
    const foldProgramIr = await fetchJson(`${baseUrl}/${firstCase.artifact_paths.fold_program_ir}`);
    assert.equal(foldProgramIr.type, "foldgen.fold_program_ir.v1");
    const stepVisuals = await fetchJson(`${baseUrl}/${firstCase.artifact_paths.step_visuals}`);
    assert.equal(stepVisuals.step_count, firstCase.selected_operation_count);
    assert.match(stepVisuals.steps[0].svg, /<svg/);
    assert.equal(stepVisuals.steps[0].preview_3d.type, "foldgen.preview.v1");
    assert.ok(stepVisuals.steps[0].preview_3d.faces.length > 0);
    const executorImage = await fetch(`${baseUrl}/${dogSequence.executor_visual_metadata.visual_asset_path}`);
    assert.equal(executorImage.status, 200);
    assert.equal(executorImage.headers.get("content-type"), "image/png");
    const walkthrough = await fetchJson(`${baseUrl}/${firstCase.artifact_paths.visual_walkthrough}`);
    assert.equal(walkthrough.status, "walkthrough-complete");
    assert.equal(walkthrough.frame_count, firstCase.selected_operation_count + 1);

    const preview = await fetchJson(`${baseUrl}/${firstCase.artifact_paths.preview}`);
    assert.equal(preview.type, "foldgen.preview.v1");
    const animation = await fetchJson(`${baseUrl}/${firstCase.artifact_paths.preview_animation}`);
    assert.equal(animation.type, "foldgen.preview_animation.v1");
    assert.equal(animation.frame_count, firstCase.selected_operation_count + 1);

    const missing = await fetch(`${baseUrl}/demo/missing.js`);
    assert.equal(missing.status, 404);
  } finally {
    await close(server);
  }
});

test("demo app boots on project pages and requests pipeline summary", async () => {
  const script = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const requested = [];
  let resolveFetch;
  const fetchSeen = new Promise((resolve) => {
    resolveFetch = resolve;
  });

  const context = createBrowserStub({
    href: "https://miaodx.com/foldgen/",
    fetch: async (url) => {
      requested.push(String(url));
      resolveFetch();
      return {
        ok: true,
        json: async () => ({ cases: [] })
      };
    }
  });

  vm.runInNewContext(script, context, { filename: "demo/app.js" });
  await Promise.race([
    fetchSeen,
    delay(100).then(() => {
      throw new Error("demo app did not request pipeline summary");
    })
  ]);

  assert.deepEqual(requested, ["https://miaodx.com/foldgen/out/m2-pipeline/summary.json"]);
});

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

async function fetchText(url) {
  const response = await fetch(url);
  assert.equal(response.status, 200);
  return response.text();
}

async function fetchJson(url) {
  const response = await fetch(url);
  assert.equal(response.status, 200);
  return response.json();
}

function createBrowserStub({ href, fetch }) {
  const elements = new Map();
  const location = new URL(href);

  return {
    URL,
    URLSearchParams,
    Option: class Option {
      constructor(text, value) {
        this.text = text;
        this.textContent = text;
        this.value = value;
      }
    },
    document: {
      querySelector(selector) {
        if (!elements.has(selector)) {
          elements.set(selector, createElementStub());
        }
        return elements.get(selector);
      },
      createElement() {
        return createElementStub();
      }
    },
    window: {
      location: {
        href: location.href,
        search: location.search
      },
      addEventListener() {}
    },
    fetch,
    setInterval,
    clearInterval
  };
}

function createElementStub() {
  return {
    dataset: {},
    style: {},
    children: [],
    textContent: "",
    innerHTML: "",
    value: "",
    disabled: false,
    files: null,
    addEventListener() {},
    append(child) {
      this.children.push(child);
    },
    replaceChildren(...children) {
      this.children = children;
    },
    getBoundingClientRect() {
      return { width: 560, height: 360 };
    },
    getContext() {
      return null;
    }
  };
}
