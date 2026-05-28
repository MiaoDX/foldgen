# Phase 5 Plan: Executor-readable Contract Upgrade

## Goal

Make the already-built Stage 1 pipeline produce and render genuinely
executor-readable steps under `docs/contracts/stage-1-output-contract.md`.

## Tasks

1. Add executor profile definitions for `human-hand`, `two-finger-gripper`, and
   `cat-paw-profile`.
2. Upgrade `createDiagramStep` to emit structured executor-readable fields:
   executor profile, pre-state, landmarks, anchor/grip, fold direction,
   alignment target, crease/press, release, checks, failure modes, and
   annotations.
3. Update the deterministic M1 runner/tests so missing executor-readable fields
   fail.
4. Update the M2 pipeline so every selected curated case writes an
   executor-readable sequence and claim status.
5. Update the demo UI so selected cases show the active executor profile and
   action flow, not just a title and one sentence.
6. Upgrade `validate:claims` or add a focused gate so public labels may use
   `simulator-valid / executor-readable / embodiment-untested` only after
   structured executor-readable evidence exists.
7. Update README, demo docs, blog draft, launch checklist, `STATUS.md`, and
   `.planning/ROADMAP.md` after the gate passes.

## Verification

Required proof:

- `npm test`
- `npm run validate:fixtures`
- `npm run m1:deterministic`
- `npm run m2:pipeline`
- focused executor-readable/claim validator
- `npm run validate:stage1`
- local demo smoke test for one selected case showing executor profile and
  action flow

## Acceptance

- M1 deterministic output contains the required step fields.
- M2 summary records five simulator-valid and executor-readable cases.
- M3 renders the action flow clearly for at least one selected case and keeps
  partial/error states intact.
- M4 public labels use
  `simulator-valid / executor-readable / embodiment-untested`.
- No code path claims `embodiment-validated` without final records.
