# Phase 3 Context: M3 Web Demo

## Source

- Canonical PRD: `docs/plans/stage-1-mvp.md`
- Roadmap: `.planning/ROADMAP.md`
- Requirements: `FOLDGEN-M3-WEB-DEMO`
- Completed prerequisite: commit `0f68672`

## Boundary

M3 owns a local web demo that renders existing Stage 1 pipeline outputs. It can
prepare deterministic preview data and serve static assets locally. It does not
own live provider adapters, public deployment, blog/launch copy, or human
reproducibility records.

## Required Evidence

- Curated target entry and image upload entry are present.
- The demo renders fold sequence, crease pattern, deterministic preview, and
  downloads from local pipeline outputs.
- Empty, loading, invalid input, validation failure, partial output, success,
  preview, and download states are represented.
- Tests cover static serving and the expected local artifact contract.
