# Phase 7: Local Search Loop

## Goal

Add a deterministic local search loop that builds multi-step fold sequences by
proposing local operations, rendering preview data, validating FOLD structure,
scoring candidates, and picking the next state. This replaces a purely
preselected sequence for the next experimental gate while keeping Stage 1's
public claim gate stable.

## Scope

- Add a `foldgen-agent` search module.
- Add a local CLI gate: `npm run m7:search`.
- Record per-iteration proposals, validation result, preview/render summary,
  score, selected candidate, and final selected operation sequence.
- Emit final FOLD, SVG, preview, validation, and profile-specific diagram
  sequences for `human-hand`, `two-finger-gripper`, `cat-paw-profile`, and
  `dog-paw-profile`.

## Non-goals

- No paid API, live provider, or model adapter.
- No new critic module yet; Phase 7 uses a simple deterministic score inside
  the search loop. Phase 8 will split critic v0 into its own surface.
- No image feature extraction yet; Phase 9 owns image-to-fold routing.

## Gate

```bash
npm run m7:search
npm test
```

## Completion Evidence

- `out/m7-search/summary.json` has five successful local search cases.
- Each case records at least two iterations and a selected operation sequence.
- `search-history.json` includes proposals with render, validation, score, and
  selected flags.
- Every case emits multi-step diagram sequences for all four executor profiles.

## Status

Completed on 2026-05-28.

Proof:
- `npm run m7:search`
- `npm test`
- `npm run validate:stage1`
