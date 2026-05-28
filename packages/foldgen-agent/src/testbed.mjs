import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { stableStringify } from "../../fold-core/src/index.mjs";
import { runImageToFold } from "./image-to-fold.mjs";

export async function runExpandedTestbed(options = {}) {
  const targetsDir = options.targetsDir ?? "benchmarks/targets";
  const outDir = options.outDir ?? "out/m10-testbed";
  const metadata = JSON.parse(await readFile(join(targetsDir, "metadata.json"), "utf8"));
  const targets = metadata.targets;
  if (targets.length < 10) {
    throw new Error(`expanded testbed requires at least 10 targets, found ${targets.length}`);
  }
  const creativeCases = targets.filter((target) => String(target.usage ?? "").includes("creative/reference"));
  if (creativeCases.length < 5) {
    throw new Error(`expanded testbed requires at least 5 creative/reference cases, found ${creativeCases.length}`);
  }

  await mkdir(outDir, { recursive: true });
  const cases = [];
  for (const target of targets) {
    const caseOutDir = join(outDir, target.file.replace(/\.svg$/i, ""));
    const result = await runImageToFold({
      referencePath: join(targetsDir, target.file),
      targetsDir,
      outDir: caseOutDir
    });
    cases.push({
      target_file: target.file,
      target_name: target.name,
      usage: target.usage,
      ok: result.ok,
      selected_case_id: result.selection.selected_case_id,
      selected_base_form: result.selection.selected_base_form,
      selected_target_file: result.selection.selected_target_file,
      executor_readable: result.search_case.executor_readable,
      selected_operation_count: result.search_case.selected_operation_count,
      artifact_paths: {
        summary: toPosix(join(caseOutDir, "summary.json"))
      }
    });
  }

  const summary = {
    milestone: "M10",
    ok: cases.every((testbedCase) => testbedCase.ok),
    target_count: targets.length,
    creative_reference_count: creativeCases.length,
    cases
  };
  await writeJson(join(outDir, "summary.json"), summary);
  return summary;
}

async function writeJson(path, value) {
  await writeFile(path, `${stableStringify(value, 2)}\n`, "utf8");
}

function toPosix(path) {
  return path.split("\\").join("/");
}
