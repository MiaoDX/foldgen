# Phase 4 Plan: M4 Technical Closeout And Claim Guard

## Goal

Close Stage 1 with evidence-backed labels while keeping physical-executor
validation as a final-stage claim gate. Under the refined contract, M4 also
guards the difference between `simulator-valid`, `executor-readable`, and
`embodiment-validated`.

## Tasks

1. [x] Run and record `npm run validate:stage1` as the current technical gate.
2. [x] Validate that every public physical-execution claim references a final
   embodiment record, or is labeled untested.
3. [x] Label simulator-valid but untested cases as not embodiment-validated.
4. [x] Recheck related-work status before public launch copy.
5. [x] Keep `npm run validate:embodiment` documented as final-stage only.
6. [ ] Upgrade claim labels to require executor-readable evidence before using
   `simulator-valid / executor-readable / embodiment-untested`.

## Claim Gate

No external executor record is required for current Stage 1 work. Final physical
execution claims require records under `docs/embodiment-validation/attempts/`
using `docs/embodiment-validation/attempt-template.json`.

## Verification

M4 verification should include:

- `npm run validate:stage1`
- no public embodiment-validated claim without a passing final record
- no public executor-readable claim without structured executor-readable step
  artifacts
- `npm run validate:embodiment` only when final records are intentionally added
- current related-work check before launch copy

## Completion Evidence

- `npm test`
- `npm run validate:stage1`
- `npm run validate:claims`
- Public claim-label validator checks README, demo docs, demo code, launch
  checklist, blog draft, and generated M2 pipeline summary.
- Related-work check recorded at
  `docs/launch/related-work-check-2026-05-28.md`.

Refined-contract gap:
- The original M4 gate only enforced `simulator-valid / embodiment-untested`.
  It must be upgraded to include executor-readable evidence.
