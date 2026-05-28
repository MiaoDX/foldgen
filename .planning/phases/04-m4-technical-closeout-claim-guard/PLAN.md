# Phase 4 Plan: M4 Technical Closeout And Claim Guard

## Goal

Close Stage 1 with evidence-backed labels while keeping physical-executor
validation as a final-stage claim gate.

## Tasks

1. Run and record `npm run validate:stage1` as the current technical gate.
2. Validate that every public physical-execution claim references a final
   embodiment record, or is labeled untested.
3. Label simulator-valid but untested cases as not embodiment-validated.
4. Recheck related-work status before public launch copy.
5. Keep `npm run validate:embodiment` documented as final-stage only.

## Claim Gate

No external executor record is required for current Stage 1 work. Final physical
execution claims require records under `docs/embodiment-validation/attempts/`
using `docs/embodiment-validation/attempt-template.json`.

## Verification

M4 verification should include:

- `npm run validate:stage1`
- no public embodiment-validated claim without a passing final record
- `npm run validate:embodiment` only when final records are intentionally added
- current related-work check before launch copy
