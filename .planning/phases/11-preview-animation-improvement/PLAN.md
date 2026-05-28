# Phase 11: Preview And Animation Improvement

## Goal

Improve preview output from a static inspection model into a sequence-aware
animation artifact derived from operation history, and make the demo render it
while preserving the static preview fallback.

## Scope

- Add `fold-core` preview animation generation.
- Emit `preview-animation.json` from deterministic multi-step, pipeline, search,
  and image-to-fold paths where operation history exists.
- Add `npm run m11:preview` as a focused gate.
- Update demo fetching/rendering to animate frames when present.

## Non-goals

- No physics simulator.
- No 3D engine.
- No physical execution claim.

## Gate

```bash
npm run m11:preview
npm test
npm run validate:stage1
```

## Completion Evidence

- `out/m11-preview/preview-animation.json` contains multiple frames.
- Pipeline/search/image-to-fold artifacts expose `preview_animation` paths.
- Demo tests prove the animation artifact is served and app code renders it.

## Status

Completed on 2026-05-28.

Proof:
- `npm run m11:preview`
- `npm test`
- `npm run validate:stage1`
