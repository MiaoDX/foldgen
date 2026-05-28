# Phase 6: Multi-step Fold Operation Foundation

## Goal

Move foldgen from one local fold operation per case to ordered operation
sequences. This is the dependency for local search, critic scoring,
image-to-fold, expanded testbed runs, and meaningful preview animation.

## Scope

- Add `fold-core` support for applying an operation list while preserving
  ordered `foldgen_history`.
- Provide a deterministic multi-step demo sequence.
- Emit multi-step diagram sequences for `human-hand`, `two-finger-gripper`,
  `cat-paw-profile`, and `dog-paw-profile`.
- Update the curated local pipeline so all five Stage 1 cases select a
  multi-step candidate.
- Add a focused command and tests.

## Non-goals

- No live model provider adapter.
- No physical execution claim.
- No new critic/search policy yet; Phase 6 only makes sequences first-class.

## Gate

```bash
npm run m6:multistep
npm test
npm run validate:stage1
```

## Completion Evidence

- `out/m6-multistep/derived.fold` validates and contains more than one
  operation in `foldgen_history`.
- `out/m6-multistep/diagram-sequence.json` has `step_count > 1`.
- Profile-specific sequence files exist for human hand, robot gripper, cat paw,
  and dog paw.
- M2 pipeline summaries record multi-step selected candidates without weakening
  the Stage 1 claim label.

## Status

Completed on 2026-05-28.

Proof:
- `npm run m6:multistep`
- `npm test`
- `npm run validate:stage1`
