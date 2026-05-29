#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { once } from "node:events";

const port = Number(process.env.FOLDGEN_THREE_PREVIEW_PORT ?? 4175);
const chromePort = Number(process.env.FOLDGEN_CHROME_PORT ?? 9225);
const chromePath = process.env.CHROME_BIN ?? "/usr/bin/google-chrome";
const qaDir = "tmp/qa";

const server = spawn(process.execPath, ["demo/server.mjs", String(port)], {
  stdio: ["ignore", "pipe", "pipe"]
});
const chrome = spawn(chromePath, [
  "--headless=new",
  `--remote-debugging-port=${chromePort}`,
  "--no-sandbox",
  "--user-data-dir=/tmp/foldgen-three-preview-chrome",
  "about:blank"
], {
  stdio: ["ignore", "pipe", "pipe"]
});

try {
  await waitForHttp(`http://127.0.0.1:${port}/demo/`);
  await waitForHttp(`http://127.0.0.1:${chromePort}/json/version`);
  await mkdir(qaDir, { recursive: true });
  const fish = await inspectPage(`http://127.0.0.1:${port}/demo/?case=simple-fish`, "foldgen-fish-three-preview", {
    expectedState: "Partial",
    expectedWebgl: true,
    expectedDisplayText: "completed 3D folded-state render; walkthrough partial"
  });
  const boat = await inspectPage(`http://127.0.0.1:${port}/demo/?case=simple-boat`, "foldgen-boat-blocked-preview", {
    expectedState: "Partial",
    expectedWebgl: false,
    expectedDisplayText: "blocked by solver; inspection only"
  });
  const fishStep = await inspectPage(`http://127.0.0.1:${port}/demo/?case=simple-fish&profile=cat-paw-profile&step=4`, "foldgen-fish-step-four-cat-overlay", {
    expectedState: "Partial",
    expectedWebgl: true,
    expectedDisplayText: "completed 3D folded-state render; walkthrough partial",
    expectedStepText: "Step 4",
    expectedProfileText: "Cat paw",
    expectedOverlayText: "precision-actions-blocked-or-fixture-needed"
  });
  const summary = {
    ok: fish.ok && boat.ok && fishStep.ok,
    webgl_available: fish.has_webgl_canvas,
    screenshots: {
      fish: `${qaDir}/foldgen-fish-three-preview.png`,
      boat: `${qaDir}/foldgen-boat-blocked-preview.png`,
      fish_step: `${qaDir}/foldgen-fish-step-four-cat-overlay.png`
    },
    fish,
    boat,
    fish_step: fishStep
  };
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await stopProcess(server);
  await stopProcess(chrome);
}

async function inspectPage(url, label, expectations = {}) {
  const tab = await (await fetch(`http://127.0.0.1:${chromePort}/json/new?${encodeURIComponent(url)}`, { method: "PUT" })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const callbacks = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) {
        callbacks.reject(new Error(JSON.stringify(message.error)));
      } else {
        callbacks.resolve(message.result);
      }
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const message = { id: ++id, method, params };
    pending.set(message.id, { resolve, reject });
    ws.send(JSON.stringify(message));
  });
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Page.navigate", { url });
  await new Promise((resolve) => setTimeout(resolve, 1600));
  const evaluation = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: pageInspectionExpression(label, expectations)
  });
  const screenshot = await send("Page.captureScreenshot", { format: "png" });
  await writeFile(`${qaDir}/${label}.png`, Buffer.from(screenshot.data, "base64"));
  await fetch(`http://127.0.0.1:${chromePort}/json/close/${tab.id}`);
  ws.close();
  return evaluation.result.value;
}

function pageInspectionExpression(label, expectations = {}) {
  return `(() => {
    const stage = document.querySelector("#folded-preview-stage");
    const webglCanvas = stage?.querySelector("canvas");
    const fallback = document.querySelector("#preview-canvas");
    const displayText = Array.from(document.querySelectorAll("#case-evidence dd")).map((node) => node.textContent).join(" | ");
    const stepDetailText = document.querySelector("#step-detail")?.textContent || "";
    const activeStepTab = document.querySelector(".step-tab[data-active='true']")?.textContent || "";
    const executorCaption = document.querySelector("#executor-caption")?.textContent || "";
    const canvas = webglCanvas || fallback;
    let nonblank = false;
    if (canvas) {
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (gl) {
        const pixels = new Uint8Array(4 * 16 * 16);
        gl.readPixels(0, 0, 16, 16, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        nonblank = pixels.some((value, index) => index % 4 !== 3 && value !== 0);
      } else {
        const ctx = canvas.getContext("2d");
        const data = ctx?.getImageData(0, 0, Math.min(16, canvas.width), Math.min(16, canvas.height)).data;
        nonblank = data ? Array.from(data).some((value, index) => index % 4 !== 3 && value !== 0) : false;
      }
    }
    const state = document.querySelector("#state-pill")?.textContent;
    const hasWebglCanvas = Boolean(webglCanvas);
    const expectedState = ${JSON.stringify(expectations.expectedState ?? "Success")};
    const expectedWebgl = ${JSON.stringify(expectations.expectedWebgl ?? null)};
    const expectedDisplayText = ${JSON.stringify(expectations.expectedDisplayText ?? null)};
    const expectedStepText = ${JSON.stringify(expectations.expectedStepText ?? null)};
    const expectedProfileText = ${JSON.stringify(expectations.expectedProfileText ?? null)};
    const expectedOverlayText = ${JSON.stringify(expectations.expectedOverlayText ?? null)};
    const rendererOk = hasWebglCanvas
      ? webglCanvas.dataset.renderer === "solver-backed-folded-state"
      : fallback?.hidden === false && stage?.hidden === true;
    const webglOk = expectedWebgl === null || hasWebglCanvas === expectedWebgl;
    const displayOk = !expectedDisplayText || displayText.includes(expectedDisplayText);
    const stepOk = !expectedStepText || (stepDetailText.includes(expectedStepText) && activeStepTab === expectedStepText.replace("Step ", ""));
    const profileOk = !expectedProfileText || executorCaption.includes(expectedProfileText);
    const overlayOk = !expectedOverlayText || stepDetailText.includes(expectedOverlayText);
    const ok = state === expectedState && nonblank === true && rendererOk && webglOk && displayOk && stepOk && profileOk && overlayOk;
    return {
      label: ${JSON.stringify(label)},
      ok,
      state,
      expected_state: expectedState,
      has_webgl_canvas: hasWebglCanvas,
      expected_webgl: expectedWebgl,
      renderer: webglCanvas?.dataset.renderer || null,
      fallback_hidden: fallback?.hidden ?? null,
      stage_hidden: stage?.hidden ?? null,
      nonblank,
      display_text: displayText,
      step_detail_text: stepDetailText,
      active_step_tab: activeStepTab,
      executor_caption: executorCaption,
      checks: {
        renderer_ok: rendererOk,
        webgl_ok: webglOk,
        display_ok: displayOk,
        step_ok: stepOk,
        profile_ok: profileOk,
        overlay_ok: overlayOk
      }
    };
  })()`;
}

async function waitForHttp(url) {
  const started = Date.now();
  while (Date.now() - started < 8000) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`${url}: did not become ready`);
}

async function stopProcess(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }
  const exited = once(child, "exit");
  child.kill("SIGTERM");
  await Promise.race([
    exited,
    new Promise((resolve) => setTimeout(resolve, 1200))
  ]);
}
