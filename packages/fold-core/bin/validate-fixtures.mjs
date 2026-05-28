#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseFold, validateFold } from "../src/index.mjs";

const baseDir = "benchmarks/base-forms";
const metadata = JSON.parse(await readFile(join(baseDir, "metadata.json"), "utf8"));
const entries = await readdir(baseDir);
const foldFiles = entries.filter((name) => name.endsWith(".fold")).sort();
const byFile = new Map(metadata.fixtures.map((fixture) => [fixture.file, fixture]));
const errors = [];
const results = [];

for (const file of foldFiles) {
  const meta = byFile.get(file);
  if (!meta) {
    errors.push(`${file}: missing metadata`);
    continue;
  }
  requireMetadataFields(meta, `${file} metadata`, ["name", "source", "usage", "license", "executor_readability_notes"], errors);
  if (String(meta.source ?? "").includes("MiaoDX/microsites")) {
    errors.push(`${file}: metadata source points at private MiaoDX/microsites`);
  }
  const fold = parseFold(await readFile(join(baseDir, file), "utf8"), file);
  const result = validateFold(fold);
  results.push({ file, expected_valid: meta.expected_valid !== false, ...result });
  if (meta.expected_valid === false && result.ok) {
    errors.push(`${file}: expected invalid but validation passed`);
  }
  if (meta.expected_valid !== false && !result.ok) {
    errors.push(`${file}: expected valid but validation failed: ${result.errors.join("; ")}`);
  }
}

for (const fixture of metadata.fixtures) {
  if (!foldFiles.includes(fixture.file)) {
    errors.push(`${fixture.file}: metadata points at missing file`);
  }
}

const targetMetadata = JSON.parse(await readFile("benchmarks/targets/metadata.json", "utf8"));
if (targetMetadata.targets.length < 3) {
  errors.push("benchmarks/targets/metadata.json must define at least three targets");
}
for (const target of targetMetadata.targets) {
  requireMetadataFields(target, `${target.file} metadata`, ["name", "source", "usage", "license", "executor_readability_notes"], errors);
  if (String(target.source ?? "").includes("MiaoDX/microsites")) {
    errors.push(`${target.file}: metadata source points at private MiaoDX/microsites`);
  }
  await readFile(join("benchmarks/targets", target.file), "utf8");
}

console.log(JSON.stringify({ ok: errors.length === 0, results, errors }, null, 2));
if (errors.length > 0) {
  process.exitCode = 1;
}

function requireMetadataFields(metadata, label, fields, errors) {
  for (const field of fields) {
    if (typeof metadata[field] !== "string" || metadata[field].trim() === "") {
      errors.push(`${label}: missing ${field}`);
    }
  }
}
