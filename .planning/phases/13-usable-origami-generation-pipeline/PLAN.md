# Phase 13: Usable Origami Generation Pipeline

## Goal

Turn the current partially solver-backed demo into a usable origami generation
pipeline where completed results are real artifact-backed outputs, not
schematic explanations.

The phase starts from the local Phase 12 implementation:

- solver-state artifacts exist;
- target-match gates exist;
- Three.js preview exists for completed cases;
- `simple-fish` is the only currently completed case;
- boat/bird/star are blocked by solver failure, and flower is blocked by
  target-match.

## Source Of Truth

Canonical plan: `docs/plans/usable-origami-generation-pipeline.md`.

Preceding plan: `docs/plans/solver-backed-real-folding-pipeline.md`, which
implemented the first solver-backed slice but did not finish real step-state
walkthroughs or executor overlays.

## Scope

1. Harden completed-vs-blocked display semantics.
2. Promote only known-good solver-backed targets.
3. Add step-state walkthrough artifacts and visual checks.
4. Add geometry-linked human/gripper/paw overlays.
5. Route search through solver-state and target-match scoring.

## Non-goals

- No physical execution claim.
- No Rabbit Ear core runtime dependency.
- No full Origami Simulator embed unless it is isolated behind an adapter.
- No fake 3D or decorative executor images as completion evidence.

## Implementation Slices

### Slice A: Display gate hardening

- Add `display_mode` to case summaries.
- Drive demo panels from `display_mode`.
- Preserve selected step number and step-specific detail in the UI.
- Remove or annotate ambiguous dashed/reference lines.

Status: Implemented.

Gate:

```bash
npm run m13:display-modes
npm run m13:three-preview
npm test
npm run validate:stage1
```

Proof:

- `npm run m13:display-modes`
- `npm run m13:three-preview`
- `npm run m12:solver-state`
- `npm test`
- `npm run validate:stage1`
- `simple-fish`: `display_mode = completed-3d`
- `simple-boat`: `display_mode = blocked-solver`
- `simple-flower`: `display_mode = blocked-target-match`
- Step visual artifacts include profile-specific overlays for human hand,
  two-finger gripper, cat paw, and dog paw.
- The browser gate verifies `/demo/?case=simple-fish&profile=cat-paw-profile&step=4`
  keeps `Step 4` selected and renders cat-paw blocked precision overlay text.

### Slice B: Known-good completed targets

- Keep blocked cases blocked until they pass all gates.
- Add or author enough known-good targets to reach at least three completed
  default targets.
- Boat must either pass the hard gate or remain visibly blocked.

Status: Implemented for a first solver-derived known-good set.

Gate:

```bash
npm run m14:known-good-targets
npm test
npm run validate:stage1
```

Proof:

- `npm run m14:known-good-targets`
- `npm run m12:solver-state`
- `npm test`
- `npm run validate:stage1`
- Default completed cases:
  - `known-good-triangle`
  - `known-good-corner`
  - `simple-fish`
- `simple-boat` remains `blocked-solver` with Flat-Folder taco-taco conflict
  evidence.

Limitation:

- The two known-good targets are deliberately solver-derived regression
  fixtures, not richer origami animals/objects. They prove the completed-result
  gate and demo path without pretending boat/star/bird currently work.

### Slice C: Step-state walkthrough

- Generate pre/post state artifacts per step when solver/simulator data exists.
- Render lower step visuals from those artifacts for completed cases.
- Add frame-difference checks for steps that claim changed geometry.

Status: Implemented as per-step post-state extraction with honest prefix
blocking.

Gate:

```bash
npm run m15:step-state-walkthrough
npm test
npm run validate:stage1
```

Proof:

- `npm run m15:step-state-walkthrough`
- `npm run m13:three-preview`
- `npm run m12:solver-state`
- `npm test`
- `npm run validate:stage1`
- `known-good-triangle` and `known-good-corner` have complete solver-backed
  step-state walkthroughs with changed frame evidence.
- `simple-fish` records a partial step-state walkthrough: final step is
  solver-backed, intermediate prefixes are inspection-only because Flat-Folder
  fails them.

Limitation:

- This is post-state evidence, not full animated fold physics between pre/post
  states. Full pre/post state support for every multi-step prefix still needs a
  stronger simulator or a different fold-program representation.

### Slice D: Executor overlays

- Generate `executor_overlay.json` per profile and step.
- Render human hand, two-finger gripper, cat paw, and dog paw contact zones
  inside the step visual.
- Mark unsupported precision actions as blocked or fixture-needed for paw
  profiles.

Gate:

```bash
npm run m16:executor-overlays
npm test
npm run validate:stage1
```

### Slice E: Solver-search loop

- Rank candidates by solver-backed target-match score.
- Reject candidates that fail any hard gate before demo display.
- Ensure selected preview, walkthrough, and downloads all reference the same
  candidate id.

Gate:

```bash
npm run m17:solver-search
npm test
npm run validate:stage1
```

## Acceptance Criteria

- Completed cases render from `folded-state.fold` through WebGL.
- Blocked cases cannot show as completed.
- At least three default targets are completed by solver-state and target-match
  gates.
- Step walkthrough visuals are backed by step-state artifacts or explicitly
  marked inspection-only.
- Executor contact overlays are visible, profile-specific, and geometry-linked.
- Batch labels remain honest: no physical or completed-target claim without the
  corresponding artifact evidence.
