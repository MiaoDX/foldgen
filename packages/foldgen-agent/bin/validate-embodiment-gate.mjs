#!/usr/bin/env node
import { validateEmbodimentGate } from "../src/index.mjs";

const recordsDir = process.argv[2] ?? "docs/embodiment-validation/attempts";
const result = await validateEmbodimentGate({ recordsDir });

console.log(JSON.stringify(result, null, 2));
if (!result.ok) {
  process.exitCode = 1;
}
