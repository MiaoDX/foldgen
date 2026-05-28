# foldgen

## Purpose

foldgen is an AI origami design tool that turns a reference image or curated
text target into a FOLD artifact, crease pattern SVG, folding sequence, preview
data, and human-readable teaching diagram.

## Current Milestone

Stage 1 MVP: prove foldgen can start from a small public FOLD testbed and
produce verified, teachable origami outputs without private runtime assets.

## Success Metrics

- Absolute: five demo cases are simulator-valid and expose FOLD, crease SVG,
  preview data, and executor-readable steps without requiring external people.
  After the 2026-05-28 contract refinement, executor-readable means structured
  executor profile plus action flow, not a one-sentence step.
- Engineering: M0/M1 can be installed, tested, and run locally without
  `MiaoDX/microsites`, paid model APIs, or manual asset copying.
- Launch: public README/blog claims distinguish simulator-valid, untested,
  failed, and embodiment-validated cases.

## Constraints

- Runtime fixtures and target assets must live in this public repo.
- `fold-core` is deterministic glue only: no AI calls, provider policy, private
  assets, or agent logic.
- M0/M1 use deterministic or mock proposals before any live provider adapter.
- Physical-execution claims wait for final embodiment records; current technical
  work does not.

## Provenance

- Primary plan: `docs/plans/stage-1-mvp.md`
- Strategic source: `docs/PLAN.md`
- Domain language: `docs/CONTEXT.md`
- Agent rules: `docs/AGENTS.md`
- Handoff mode: degraded inline GSD handoff after worker stall.
