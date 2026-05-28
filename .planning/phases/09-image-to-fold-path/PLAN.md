# Phase 9: Image-to-fold Path

## Goal

Let a local reference image/SVG enter the generation path directly. The system
should analyze the reference file, choose a base-form/profile with reasons, run
local search, and write fold, preview, validation, critic/search history, and
executor-readable diagram artifacts.

## Scope

- Add a deterministic reference image analyzer for local SVG fixtures.
- Add base-form/profile selection with ranked reasons.
- Add a local CLI gate:
  `npm run m9:image-to-fold -- benchmarks/targets/simple-bird.svg`.
- Reuse the Phase 7 search loop and Phase 8 critic output.

## Non-goals

- No raster computer vision model or paid provider.
- No arbitrary internet image ingestion.
- No physical execution claim.

## Gate

```bash
npm run m9:image-to-fold -- benchmarks/targets/simple-bird.svg
npm test
```

## Completion Evidence

- `out/m9-image-to-fold/summary.json` records source image analysis,
  base-form/profile selection, local search result, and artifact paths.
- The selected path writes final FOLD, SVG, preview, validation, search history,
  and all four executor profile diagram sequences.
- Tests prove at least two different reference SVGs route to their expected
  profiles/base forms.

## Status

Completed on 2026-05-28.

Proof:
- `npm run m9:image-to-fold -- benchmarks/targets/simple-bird.svg`
- `npm test`
- `npm run validate:stage1`
