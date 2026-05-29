import { createRequire } from "node:module";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

import { parseFold, stableStringify, validateFold } from "../../fold-core/src/index.mjs";

const require = createRequire(import.meta.url);

export const COMMUNITY_FOLD_ADAPTER_ID = "community-fold";
export const FLAT_FOLDER_ADAPTER_ID = "flat-folder";
export const DEFAULT_PIPELINE_DIR = "out/m2-pipeline";
export const DEFAULT_FOLD_COMPATIBILITY_PATH = "out/community-validation/fold-compatibility.json";

export async function collectFoldArtifactPaths(options = {}) {
  const baseFormsDir = options.baseFormsDir ?? "benchmarks/base-forms";
  const pipelineDir = options.pipelineDir ?? DEFAULT_PIPELINE_DIR;
  const baseMetadata = await loadBaseFormMetadata(baseFormsDir);
  const paths = [];

  for (const file of await listFoldFiles(baseFormsDir)) {
    paths.push({
      path: join(baseFormsDir, file),
      expected_valid: baseMetadata.get(file)?.expected_valid !== false
    });
  }

  let pipelineEntries = [];
  try {
    pipelineEntries = await readdir(pipelineDir, { withFileTypes: true });
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  for (const entry of pipelineEntries) {
    if (!entry.isDirectory()) {
      continue;
    }
    for (const file of await listFoldFiles(join(pipelineDir, entry.name))) {
      paths.push({
        path: join(pipelineDir, entry.name, file),
        expected_valid: true
      });
    }
  }

  return paths.sort((a, b) => a.path.localeCompare(b.path));
}

export async function runCommunityFoldCompatibility(options = {}) {
  const paths = options.paths ?? await collectFoldArtifactPaths(options);
  const outputPath = options.outputPath ?? DEFAULT_FOLD_COMPATIBILITY_PATH;
  const adapter = communityFoldAdapterInfo();
  const results = [];

  for (const entry of paths) {
    results.push(await checkCommunityFoldArtifact(entry.path ?? entry, adapter, {
      expectedValid: entry.expected_valid !== false
    }));
  }

  const ok = results.every((result) => result.expected_result === true);
  const summary = {
    adapter_id: COMMUNITY_FOLD_ADAPTER_ID,
    tool_name: adapter.tool_name,
    tool_version: adapter.tool_version,
    status: ok ? "passed" : "failed",
    ok,
    checked_count: results.length,
    output_artifact_paths: [toRepoPath(outputPath)],
    results
  };

  await writeJson(outputPath, summary);
  return summary;
}

export async function checkCommunityFoldArtifact(path, adapter = communityFoldAdapterInfo(), options = {}) {
  const expectedValid = options.expectedValid !== false;
  const errors = [];
  const warnings = [];
  let parsed;
  try {
    parsed = parseFold(await readFile(path, "utf8"), path);
  } catch (error) {
    errors.push(error.message);
  }

  if (parsed) {
    const localValidation = validateFold(parsed);
    errors.push(...localValidation.errors.map((error) => `local structural validation: ${error}`));
    warnings.push(...localValidation.warnings.map((warning) => `local structural validation: ${warning}`));
    try {
      withSuppressedConsoleSync(() => adapter.fold.convert.edges_vertices_to_faces_vertices(cloneJson(parsed)));
    } catch (error) {
      errors.push(`fold.convert.edges_vertices_to_faces_vertices: ${error.message}`);
    }
    try {
      withSuppressedConsoleSync(() => adapter.fold.convert.faces_vertices_to_faces_edges(cloneJson(parsed)));
    } catch (error) {
      warnings.push(`fold.convert.faces_vertices_to_faces_edges: ${error.message}`);
    }
  }

  const status = errors.length === 0 ? "passed" : "failed";
  const expectedResult = expectedValid ? status === "passed" : status === "failed";
  return {
    adapter_id: COMMUNITY_FOLD_ADAPTER_ID,
    tool_name: adapter.tool_name,
    tool_version: adapter.tool_version,
    input_artifact_path: toRepoPath(path),
    output_artifact_paths: [],
    status,
    expected_valid: expectedValid,
    expected_result: expectedResult,
    errors,
    warnings,
    claim_effect: status === "passed"
      ? "supports community FOLD compatibility; does not prove flat-foldability or embodiment"
      : "community FOLD compatibility failed; public claim must not be upgraded"
  };
}

export async function runFlatFolderValidation(options = {}) {
  const summaryPath = options.summaryPath ?? join(options.pipelineDir ?? DEFAULT_PIPELINE_DIR, "summary.json");
  const summary = JSON.parse(await readFile(summaryPath, "utf8"));
  const adapter = await flatFolderAdapterInfo();
  const cases = [];

  for (const pipelineCase of summary.cases ?? []) {
    const inputPath = pipelineCase.artifact_paths?.derived_fold;
    if (!inputPath) {
      continue;
    }
    const outputPath = join(dirname(inputPath), "flat-folder-validation.json");
    const result = await validateFlatFolderArtifact(inputPath, outputPath, adapter);
    cases.push({
      case_id: pipelineCase.case_id,
      result_path: toRepoPath(outputPath),
      status: result.status,
      claim_effect: result.claim_effect
    });
  }

  const ok = cases.length > 0 && cases.every((pipelineCase) => pipelineCase.status === "passed");
  return {
    adapter_id: FLAT_FOLDER_ADAPTER_ID,
    tool_name: adapter.tool_name,
    tool_version: adapter.tool_version,
    status: ok ? "passed" : "failed",
    ok,
    case_count: cases.length,
    cases
  };
}

export async function validateFlatFolderArtifact(inputPath, outputPath, adapter) {
  adapter ??= await flatFolderAdapterInfo();
  const result = adapter.available
    ? await runFlatFolderBatch(inputPath, outputPath, adapter)
    : unsupportedFlatFolderResult(inputPath, outputPath, adapter);
  await writeJson(outputPath, result);
  return result;
}

export function buildExternalValidationStatus({ foldCompatibility, flatFolder } = {}) {
  return {
    community_fold: foldCompatibility ? summarizeExternalResult(foldCompatibility) : missingExternalResult(COMMUNITY_FOLD_ADAPTER_ID),
    flat_folder: flatFolder ? summarizeExternalResult(flatFolder) : missingExternalResult(FLAT_FOLDER_ADAPTER_ID)
  };
}

export function getExecutorVisualMetadata(profileId) {
  const contactZones = {
    "human-hand": ["left fingertip anchor", "right fingertip fold", "index-finger crease press"],
    "two-finger-gripper": ["fixed jaw anchor", "moving jaw pinch", "short segment press"],
    "cat-paw-profile": ["broad paw-pad anchor", "soft paw sweep", "repeated pad presses"],
    "dog-paw-profile": ["large paw brace", "controlled paw sweep", "slow pad pressure"]
  };
  const unsupportedActions = {
    "human-hand": [],
    "two-finger-gripper": ["multi-point drag"],
    "cat-paw-profile": ["precision pinch", "two-point alignment"],
    "dog-paw-profile": ["precision pinch", "two-point alignment", "fine fingertip crease"]
  };
  return {
    profile_id: profileId,
    contact_zones: contactZones[profileId] ?? [],
    unsupported_actions: unsupportedActions[profileId] ?? [],
    instruction_label: "template executor instructions",
    visual_asset_status: "silhouette-placeholder"
  };
}

function summarizeExternalResult(result) {
  return {
    adapter_id: result.adapter_id,
    tool_name: result.tool_name,
    tool_version: result.tool_version,
    status: result.status,
    result_path: result.output_artifact_paths?.[0] ?? null,
    errors: result.errors ?? [],
    warnings: result.warnings ?? [],
    claim_effect: result.claim_effect
  };
}

function missingExternalResult(adapterId) {
  return {
    adapter_id: adapterId,
    tool_name: adapterId,
    tool_version: "unknown",
    status: "unsupported",
    result_path: null,
    errors: [],
    warnings: ["adapter has not run for this case"],
    claim_effect: "no external validation claim"
  };
}

async function runFlatFolderBatch(inputPath, outputPath, adapter) {
  const errors = [];
  const warnings = [];
  const notes = [];
  let metrics = null;

  try {
    adapter.CON.build();
    const fold = normalizeForFlatFolder(parseFold(await readFile(inputPath, "utf8"), inputPath));
    metrics = await withCapturedConsole(() => adapter.BATCH.process_file(fold, 1), notes);
  } catch (error) {
    const detail = error.message && error.message !== "Error"
      ? error.message
      : lastUsefulNote(notes) ?? error.name ?? "Flat-Folder validation failed";
    errors.push(detail);
  }

  const status = errors.length === 0 ? "passed" : "failed";
  return {
    adapter_id: FLAT_FOLDER_ADAPTER_ID,
    tool_name: adapter.tool_name,
    tool_version: adapter.tool_version,
    input_artifact_path: toRepoPath(inputPath),
    output_artifact_paths: [toRepoPath(outputPath)],
    status,
    errors,
    warnings,
    notes,
    claim_effect: status === "passed"
      ? "supports external solver validity; does not prove embodiment"
      : "external solver validation failed; keep public claim at local simulator/executor-readable only",
    solver_limit: 1,
    metrics: normalizeMetrics(metrics)
  };
}

function unsupportedFlatFolderResult(inputPath, outputPath, adapter) {
  return {
    adapter_id: FLAT_FOLDER_ADAPTER_ID,
    tool_name: adapter.tool_name,
    tool_version: adapter.tool_version,
    input_artifact_path: toRepoPath(inputPath),
    output_artifact_paths: [toRepoPath(outputPath)],
    status: "unsupported",
    errors: [],
    warnings: [adapter.unavailable_reason],
    claim_effect: "Flat-Folder did not run; no external solver-valid claim",
    solver_limit: 1,
    metrics: null
  };
}

function normalizeForFlatFolder(fold) {
  const usedFaceEdges = new Set();
  for (const face of fold.faces_vertices ?? []) {
    for (const [index, vertex] of face.entries()) {
      usedFaceEdges.add(edgeKey([vertex, face[(index + 1) % face.length]]));
    }
  }

  const keptEdges = [];
  for (const [index, edge] of (fold.edges_vertices ?? []).entries()) {
    const key = edgeKey(edge);
    if (!usedFaceEdges.has(key)) {
      continue;
    }
    keptEdges.push({
      edge: canonicalEdge(edge),
      assignment: fold.edges_assignment?.[index] ?? "U"
    });
  }

  return {
    ...cloneJson(fold),
    edges_vertices: keptEdges.map((entry) => entry.edge),
    edges_assignment: keptEdges.map((entry) => entry.assignment),
    number: fold.file_title ?? "foldgen"
  };
}

async function flatFolderAdapterInfo() {
  try {
    const [{ BATCH }, { CON }] = await Promise.all([
      import("flat-folder/src/batch.js"),
      import("flat-folder/src/constraints.js")
    ]);
    return {
      available: true,
      BATCH,
      CON,
      tool_name: "Flat-Folder",
      tool_version: flatFolderVersion()
    };
  } catch (error) {
    return {
      available: false,
      BATCH: null,
      CON: null,
      tool_name: "Flat-Folder",
      tool_version: "unavailable",
      unavailable_reason: `Flat-Folder package is unavailable: ${error.message}`
    };
  }
}

function communityFoldAdapterInfo() {
  let fold;
  try {
    fold = require("fold");
  } catch (error) {
    throw new Error(`fold package is unavailable. Run npm install first. ${error.message}`);
  }
  return {
    fold,
    tool_name: "FOLD",
    tool_version: foldVersion()
  };
}

function foldVersion() {
  try {
    return require("fold/package.json").version;
  } catch {
    return "unknown";
  }
}

function flatFolderVersion() {
  try {
    return require("flat-folder/package.json").version ?? "github:e00732c4";
  } catch {
    return "github:e00732c4";
  }
}

async function listFoldFiles(dir) {
  const entries = await readdir(dir);
  return entries.filter((entry) => entry.endsWith(".fold")).sort();
}

async function loadBaseFormMetadata(baseFormsDir) {
  try {
    const metadata = JSON.parse(await readFile(join(baseFormsDir, "metadata.json"), "utf8"));
    return new Map((metadata.fixtures ?? []).map((fixture) => [fixture.file, fixture]));
  } catch {
    return new Map();
  }
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${stableStringify(value, 2)}\n`, "utf8");
}

function normalizeMetrics(metrics) {
  if (!metrics) {
    return null;
  }
  return JSON.parse(JSON.stringify(metrics, (_key, value) => (
    typeof value === "bigint" ? value.toString() : value
  )));
}

function canonicalEdge(edge) {
  return [...edge].sort((a, b) => a - b);
}

function edgeKey(edge) {
  return canonicalEdge(edge).join(":");
}

function toRepoPath(path) {
  return relative(process.cwd(), path).split("\\").join("/");
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function withSuppressedConsoleSync(fn) {
  const originalLog = console.log;
  const originalWarn = console.warn;
  try {
    console.log = () => {};
    console.warn = () => {};
    return fn();
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }
}

async function withSuppressedConsole(fn) {
  const originalLog = console.log;
  const originalWarn = console.warn;
  try {
    console.log = () => {};
    console.warn = () => {};
    return await fn();
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }
}

async function withCapturedConsole(fn, notes) {
  const originalLog = console.log;
  const originalWarn = console.warn;
  try {
    console.log = (...args) => {
      notes.push(args.map(String).join(" "));
    };
    console.warn = (...args) => {
      notes.push(args.map(String).join(" "));
    };
    return await fn();
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }
}

function lastUsefulNote(notes) {
  return [...notes].reverse().find((note) => note.trim() !== "");
}
