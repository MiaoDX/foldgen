# foldgen

## Purpose

foldgen is an AI origami design tool that turns a reference image or curated
text target into a FOLD artifact, crease pattern SVG, folding sequence, preview
data, and human-readable teaching diagram.

## Current Milestone

Stage 1 MVP: prove foldgen can start from a small public FOLD testbed and
produce verified, teachable origami outputs without private runtime assets.

## Success Metrics

- Absolute: five demo cases include human reproducibility records with pass/fail
  notes.
- Engineering: M0/M1 can be installed, tested, and run locally without
  `MiaoDX/microsites`, paid model APIs, or manual asset copying.
- Launch: public README/blog claims distinguish simulator-valid, untested,
  failed, and human-reproduced cases.

## Constraints

- Runtime fixtures and target assets must live in this public repo.
- `fold-core` is deterministic glue only: no AI calls, provider policy, private
  assets, or agent logic.
- M0/M1 use deterministic or mock proposals before any live provider adapter.
- Stage 2 publication/external-adapter work waits for Stage 1 human records.

## Provenance

- Primary plan: `docs/plans/stage-1-mvp.md`
- Strategic source: `docs/PLAN.md`
- Domain language: `docs/CONTEXT.md`
- Agent rules: `docs/AGENTS.md`
- Handoff mode: degraded inline GSD handoff after worker stall.
