import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { stableStringify } from "../../fold-core/src/index.mjs";
import { runLocalSearchCase } from "./search.mjs";
import { targetProfiles } from "./pipeline.mjs";

const FEATURE_HINTS = {
  bird: ["bird", "wing", "wings", "beak", "upright"],
  fish: ["fish", "tail", "body", "horizontal"],
  flower: ["flower", "petal", "petals", "radial", "center", "circle"],
  boat: ["boat", "sail", "hull", "mast"],
  star: ["star", "point", "points", "radial", "center"]
};

export async function runImageToFold(options = {}) {
  const referencePath = options.referencePath;
  if (!referencePath) {
    throw new Error("runImageToFold requires referencePath");
  }
  const targetsDir = options.targetsDir ?? "benchmarks/targets";
  const baseFormsDir = options.baseFormsDir ?? "benchmarks/base-forms";
  const outDir = options.outDir ?? "out/m9-image-to-fold";
  await mkdir(outDir, { recursive: true });

  const metadata = JSON.parse(await readFile(join(targetsDir, "metadata.json"), "utf8"));
  const analysis = await analyzeReferenceImage(referencePath);
  const selection = selectProfileForImage(analysis, metadata.targets);
  const searchCase = await runLocalSearchCase({
    target: selection.target,
    profile: selection.profile,
    baseFormsDir,
    targetsDir,
    outDir,
    maxIterations: options.maxIterations ?? 2,
    beamWidth: options.beamWidth ?? 3
  });

  const summary = {
    milestone: "M9",
    ok: searchCase.status === "valid" && searchCase.executor_readable === true,
    reference_path: toPosix(relative(process.cwd(), referencePath)),
    image_analysis: analysis,
    selection: {
      selected_case_id: selection.profile.caseId,
      selected_target_file: selection.target.file,
      selected_base_form: selection.profile.baseForm,
      score: selection.score,
      reasons: selection.reasons,
      ranked_candidates: selection.rankedCandidates
    },
    search_case: searchCase
  };

  await writeJson(join(outDir, "image-analysis.json"), analysis);
  await writeJson(join(outDir, "selection.json"), summary.selection);
  await writeJson(join(outDir, "summary.json"), summary);
  return summary;
}

export async function analyzeReferenceImage(referencePath) {
  const content = await readFile(referencePath, "utf8");
  const lower = content.toLowerCase();
  const fileName = basename(referencePath).toLowerCase();
  const ariaLabels = [...content.matchAll(/aria-label="([^"]+)"/gi)].map((match) => match[1].toLowerCase());
  const text = `${fileName} ${ariaLabels.join(" ")} ${lower}`;
  const tokens = unique(text.split(/[^a-z0-9-]+/).filter(Boolean));
  const featureTokens = unique(Object.values(FEATURE_HINTS).flat().filter((hint) => tokens.some((token) => token.includes(hint))));
  const shapeCounts = {
    path: countMatches(lower, /<path\b/g),
    circle: countMatches(lower, /<circle\b/g),
    polygon: countMatches(lower, /<polygon\b/g),
    line: countMatches(lower, /<line\b/g)
  };
  return {
    type: "foldgen.reference_image_analysis.v1",
    file: toPosix(relative(process.cwd(), referencePath)),
    media_type: referencePath.toLowerCase().endsWith(".svg") ? "image/svg+xml" : "unknown",
    tokens,
    feature_tokens: featureTokens,
    shape_counts: shapeCounts,
    text_hints: ariaLabels
  };
}

export function selectProfileForImage(analysis, targets) {
  const targetByFile = new Map(targets.map((target) => [target.file, target]));
  const selectableTargets = targets.flatMap((target) => {
    const profile = targetProfiles[target.file] ?? profileByHint(target.profile_hint);
    if (!profile) {
      return [];
    }
    return [{ target, profile }];
  });
  const rankedCandidates = selectableTargets.map(({ target, profile }) => {
    const targetWords = [
      ...profile.targetFeatures,
      profile.caseId,
      profile.baseForm,
      target.name ?? "",
      target.profile_hint ?? "",
      target.executor_readability_notes ?? ""
    ].join(" ").toLowerCase().split(/[^a-z0-9-]+/).filter(Boolean);
    const matches = unique(analysis.feature_tokens.filter((token) => targetWords.some((word) => word.includes(token) || token.includes(word))));
    const targetStem = target.file.replace(/\.svg$/i, "");
    const profileStem = profile.caseId.replace("simple-", "");
    const exactFileMatch = analysis.file.endsWith(target.file);
    const targetNameMatch = analysis.tokens.some((token) => token.includes(targetStem));
    const profileNameMatch = analysis.tokens.some((token) => token.includes(profileStem));
    const hintMatch = target.profile_hint === profile.caseId ? 0.25 : 0;
    const score = round(matches.length + hintMatch + (exactFileMatch ? 4 : 0) + (targetNameMatch ? 2 : 0) + (profileNameMatch ? 1 : 0));
    return {
      case_id: profile.caseId,
      target_file: target.file,
      base_form: profile.baseForm,
      score,
      matches,
      reasons: [
        target.profile_hint ? `metadata profile_hint maps to ${target.profile_hint}` : null,
        exactFileMatch ? `reference path matches ${target.file}` : null,
        targetNameMatch || profileNameMatch ? `reference filename/text includes ${targetStem} or ${profileStem}` : null,
        matches.length > 0 ? `matched feature tokens: ${matches.join(", ")}` : null
      ].filter(Boolean)
    };
  }).sort((a, b) => b.score - a.score || a.case_id.localeCompare(b.case_id));

  const selected = rankedCandidates[0];
  if (!selected || selected.score <= 0) {
    throw new Error(`${analysis.file}: unable to select a local target profile`);
  }
  const target = targetByFile.get(selected.target_file);
  return {
    target,
    profile: targetProfiles[selected.target_file] ?? profileByHint(target.profile_hint),
    score: selected.score,
    reasons: selected.reasons,
    rankedCandidates
  };
}

function profileByHint(profileHint) {
  if (!profileHint) {
    return null;
  }
  return Object.values(targetProfiles).find((profile) => profile.caseId === profileHint) ?? null;
}

async function writeJson(path, value) {
  await writeFile(path, `${stableStringify(value, 2)}\n`, "utf8");
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function toPosix(path) {
  return path.split("\\").join("/");
}

function round(value) {
  return Number(value.toFixed(4));
}
