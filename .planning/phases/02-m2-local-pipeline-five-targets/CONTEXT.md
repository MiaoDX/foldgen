# Phase 2 Context: M2 Local Pipeline

## Source

- Canonical PRD: `docs/plans/stage-1-mvp.md`
- Roadmap: `.planning/ROADMAP.md`
- Requirements: `FOLDGEN-M2-PIPELINE`
- Completed prerequisite: commit `5773f81`

## Boundary

M2 owns a deterministic, repo-local pipeline that runs five curated target
fixtures through base-form selection, local operation proposals, validation, and
critic records. It does not own the web demo, upload UI, live provider adapter,
CLIP integration, or human reproducibility records.

## Required Evidence

- Five target cases run from one root command.
- Each case records selected base form, candidate operations, validation status,
  proposal history, critic history, and artifact paths.
- Candidate failures are written as data instead of hidden.
- The command runs without private repos, paid APIs, or manual assets.
