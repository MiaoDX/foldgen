#!/usr/bin/env node
import { validateHumanGate } from "../src/index.mjs";

const recordsDir = process.argv[2] ?? "docs/human-reproducibility/attempts";
const result = await validateHumanGate({ recordsDir });

console.log(JSON.stringify(result, null, 2));
if (!result.ok) {
  process.exitCode = 1;
}
