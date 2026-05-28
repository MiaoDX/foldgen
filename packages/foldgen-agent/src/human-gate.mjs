import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const DEFAULT_RECORDS_DIR = "docs/human-reproducibility/attempts";
const REQUIRED_PASSING_RECORDS = 5;
const VALID_STATUSES = new Set(["pass", "fail"]);

export async function validateHumanGate(options = {}) {
  const recordsDir = options.recordsDir ?? DEFAULT_RECORDS_DIR;
  const requiredPasses = options.requiredPasses ?? REQUIRED_PASSING_RECORDS;
  const expectedCaseIds = options.expectedCaseIds ?? ["simple-bird", "simple-fish", "simple-flower", "simple-boat", "simple-star"];
  const errors = [];
  const warnings = [];
  const records = await loadRecords(recordsDir, errors);

  for (const record of records) {
    validateRecord(record, { expectedCaseIds, errors, warnings });
  }

  const passingRecords = records.filter((record) => record.status === "pass" && record.claim_allowed === true);
  if (passingRecords.length < requiredPasses) {
    errors.push(`M4 requires ${requiredPasses} passing claim-allowed human records; found ${passingRecords.length}`);
  }

  const passingCaseIds = new Set(passingRecords.map((record) => record.case_id));
  const casesWithPassingRecords = expectedCaseIds.filter((caseId) => passingCaseIds.has(caseId));
  return {
    ok: errors.length === 0,
    status: errors.length === 0 ? "complete" : "blocked",
    records_dir: recordsDir,
    required_passing_records: requiredPasses,
    record_count: records.length,
    passing_claim_allowed_record_count: passingRecords.length,
    cases_with_passing_records: casesWithPassingRecords,
    errors,
    warnings,
    records: records.map((record) => ({
      file: record.__file,
      case_id: record.case_id,
      status: record.status,
      claim_allowed: record.claim_allowed
    }))
  };
}

async function loadRecords(recordsDir, errors) {
  let files;
  try {
    files = await readdir(recordsDir);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const records = [];
  for (const file of files.filter((name) => name.endsWith(".json")).sort()) {
    const path = join(recordsDir, file);
    try {
      const record = JSON.parse(await readFile(path, "utf8"));
      records.push({ ...record, __file: path });
    } catch (error) {
      errors.push(`${path}: invalid JSON: ${error.message}`);
    }
  }
  return records;
}

function validateRecord(record, { expectedCaseIds, errors, warnings }) {
  const label = record.__file ?? "<record>";
  requireString(record.case_id, `${label}: case_id`, errors);
  requireString(record.artifact_summary, `${label}: artifact_summary`, errors);
  requireString(record.attempted_by, `${label}: attempted_by`, errors);
  requireIsoDate(record.attempted_on, `${label}: attempted_on`, errors);

  if (!VALID_STATUSES.has(record.status)) {
    errors.push(`${label}: status must be "pass" or "fail"`);
  }
  if (typeof record.claim_allowed !== "boolean") {
    errors.push(`${label}: claim_allowed must be boolean`);
  }
  if (!Array.isArray(record.notes) || record.notes.every((note) => typeof note !== "string" || note.trim() === "")) {
    errors.push(`${label}: notes must include at least one non-empty note`);
  }
  if (record.time_minutes !== null && (typeof record.time_minutes !== "number" || record.time_minutes <= 0)) {
    errors.push(`${label}: time_minutes must be null or a positive number`);
  }
  if (record.case_id && !expectedCaseIds.includes(record.case_id)) {
    warnings.push(`${label}: case_id ${record.case_id} is not in the current M2 curated case set`);
  }
  if (record.claim_allowed === true && record.status !== "pass") {
    errors.push(`${label}: claim_allowed can only be true for passing human attempts`);
  }
}

function requireString(value, label, errors) {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${label} is required`);
  }
}

function requireIsoDate(value, label, errors) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    errors.push(`${label} must be YYYY-MM-DD`);
  }
}
