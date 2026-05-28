import test from "node:test";
import assert from "node:assert/strict";

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
    assert.match(html, /id="image-upload"/);
    assert.match(html, /id="preview-canvas"/);
    assert.match(html, /id="downloads"/);
    assert.match(html, /id="embodiment-status"/);

    const script = await fetchText(`${baseUrl}/demo/app.js`);
    assert.match(script, /fetchCaseArtifacts/);
    assert.match(script, /Simulator-valid; physical executor untested/);

    const summary = await fetchJson(`${baseUrl}/out/m2-pipeline/summary.json`);
    assert.equal(summary.ok, true);
    assert.equal(summary.case_count, 5);

    const firstCase = summary.cases[0];
    const preview = await fetchJson(`${baseUrl}/${firstCase.artifact_paths.preview}`);
    assert.equal(preview.type, "foldgen.preview.v1");

    const missing = await fetch(`${baseUrl}/demo/missing.js`);
    assert.equal(missing.status, 404);
  } finally {
    await close(server);
  }
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
