# Phase 14: Real Usable Origami Generation Pipeline

## Goal

Make completed origami cases genuinely usable: backend-folded, target-like,
step-state walkthrough-backed, executor-overlay-backed, and impossible to
present as completed when any required evidence is missing.

This phase supersedes the earlier schematic-first demo improvements. Existing
Phase 12 and Phase 13 work remains useful foundation, but the success definition
is stricter.

## Source Of Truth

Canonical plan:
`docs/plans/real-usable-origami-generation-pipeline.md`.

Foundation plans:

- `docs/plans/solver-backed-real-folding-pipeline.md`
- `docs/plans/usable-origami-generation-pipeline.md`

## Product Contract

A case can be shown as `completed-usable` only when it has:

1. structural FOLD validation;
2. community FOLD compatibility;
3. folded-state backend pass;
4. backend state artifact;
5. Three.js render from backend state;
6. target-match pass;
7. complete per-step pre/post states;
8. geometry-linked executor overlays for the selected profile;
9. a display decision artifact proving all of the above.

Anything weaker must be `completed-3d-partial-walkthrough`, `blocked-*`, or
`inspection-only`.

## Implementation Slices

### Slice A: Hard display decision artifact

Goal: make overclaiming structurally impossible.

Work:

- Add `display-decision.json` per case.
- Make the demo trust only the display decision for completed state.
- Downgrade any final-3D case with missing step states or overlays out of
  `completed-usable`.
- Keep `simple-boat` blocked until all gates pass.

Gate:

```bash
npm run m18:display-decision
npm test
npm run validate:stage1
```

Status: Implemented.

Proof:

- `display-decision.json` is written per pipeline case.
- The demo fetches `display-decision.json` and uses its
  `safe_to_render_3d_preview` / `safe_to_render_completed_card` decisions.
- `known-good-triangle` and `known-good-corner` are `completed-usable`.
- `simple-fish` is downgraded to `completed-3d-partial-walkthrough` because
  step-state walkthrough evidence is partial.
- `simple-boat` remains `blocked-solver`.
- `npm run m18:display-decision`
- `npm run m13:display-modes`
- `npm run m14:known-good-targets`
- `npm run m15:step-state-walkthrough`
- `npm run m13:three-preview`
- `npm test`
- `npm run validate:stage1`

### Slice B: Origami Simulator adapter spike

Goal: determine whether Origami Simulator can provide progressive intermediate
states for real walkthroughs.

Work:

- Isolate the adapter from core runtime.
- Import one known-good FOLD/SVG case.
- Export at least two intermediate states, or record a hard blocker.
- Render exported states through the existing Three.js path.

Gate:

```bash
npm run m19:origami-simulator-spike
npm test
```

Status: Implemented as an honest blocker/route decision.

Proof:

- `npm run m19:origami-simulator-spike`
- The spike writes compatible Origami Simulator fold-percent input frames for
  `simple-fish` at 0%, 50%, and 100%.
- The generated frames are explicitly marked
  `input-frame-not-simulated-state`.
- The adapter records `status = blocked-automated-state-export` because the
  repo does not yet have an isolated local browser/Node adapter that imports a
  FOLD file, drives the official simulator, waits for convergence, and exports
  intermediate folded-state FOLD/OBJ artifacts deterministically.
- Decision: use Origami Simulator as a manual fixture/import route for now, not
  as completed-usable walkthrough evidence.

### Slice C: Known-good tutorial case set

Goal: build demos from real foldable sources, not weak curated cue sequences.

Work:

- Add provenance/licensing for tutorial sources.
- Promote only cases that pass the full artifact graph.
- Prefer a recognizable boat only if it passes; otherwise keep it blocked.

Gate:

```bash
npm run m20:known-good-tutorials
npm test
npm run validate:stage1
```

Status: Implemented for the first source/provenance boundary.

Proof:

- `npm run m20:known-good-tutorials`
- `known-good-triangle` and `known-good-corner` write
  `source-provenance.json` and are promotion-allowed as
  repo-authored solver-derived fixtures.
- Recognizable generated cue cases are not promotion-allowed.
- `simple-boat` writes provenance but remains `blocked-solver` and cannot be
  promoted.

Limitation:

- This slice establishes the source/provenance gate and preserves the two
  simple known-good fixtures. It does not yet add a richer recognizable object
  with complete tutorial state artifacts.

### Slice D: Full step-state walkthrough

Goal: make the lower panel a real selected-step replay.

Work:

- Require pre/post state artifacts per step for `completed-usable`.
- Render selected step from those artifacts.
- Enforce frame-difference evidence or explicit unchanged-state reason.

Gate:

```bash
npm run m21:full-step-states
npm test
npm run validate:stage1
```

Status: Implemented as a hard validator around existing step-state artifacts.

Proof:

- `npm run m21:full-step-states`
- `completed-usable` cases must have `step-states.status = complete`.
- `completed-usable` step visuals must be solver-backed and visibly changed.
- `simple-fish` remains `completed-3d-partial-walkthrough` with
  `weakest_failed_gate = step-state-walkthrough`.
- Selected step numbers and operation ids are validated across diagram sequence
  and profile-specific step visuals.

### Slice E: Executor overlay artifacts

Goal: make hand, gripper, cat paw, and dog paw overlays geometry-linked.

Work:

- Write `executor-overlays/<profile>/step-N.json`.
- Bind contacts to fold lines, anchor panels, moving panels, and direction.
- Downgrade selected executor profiles when required actions are unsupported.

Gate:

```bash
npm run m22:executor-overlay-artifacts
npm test
npm run validate:stage1
```

Status: Implemented.

Proof:

- `npm run m22:executor-overlay-artifacts`
- The pipeline writes `executor-overlays/executor-overlays.json` per case.
- Every profile writes `executor-overlays/<profile>/step-N.json` for every
  selected step.
- Step visuals reference the standalone overlay artifact path.
- Display decision uses the standalone overlay summary for the
  `executor-overlays` gate.
- Paw profiles carry blocked precision zones in the standalone artifacts.

### Slice F: Solver-backed candidate search

Goal: select generated outputs by evidence, not semantic labels.

Work:

- Persist candidate ids, scores, and blockers.
- Route candidate selection through backend pass, target-match, walkthrough
  completeness, and overlay completeness.
- Ensure preview, walkthrough, and downloads all reference the selected
  candidate id.

Gate:

```bash
npm run m23:solver-backed-search
npm test
npm run validate:stage1
```

Status: Implemented as evidence-ranked selection records.

Proof:

- `npm run m23:solver-backed-search`
- Each case writes `solver-backed-search.json`.
- The selected candidate id matches the pipeline selected candidate id.
- The selected display mode matches `display-decision.json`.
- `completed-usable` selections require solver state, target match, complete
  step states, and overlay evidence.
- Blocked selections remain available as evidence but cannot pass the hard gate.

## Acceptance Criteria

- `completed-usable` exists as a code-enforced mode.
- At least two local demo cases are `completed-usable`.
- At least one recognizable object either passes all gates or is blocked with
  exact evidence.
- The demo never shows heuristic preview as a completed result.
- The selected-step panel renders only the selected step.
- Hand/gripper/paw overlays are visible, profile-specific, and linked to fold
  geometry.
- Boat cannot be shown as successful unless it passes every hard gate.
