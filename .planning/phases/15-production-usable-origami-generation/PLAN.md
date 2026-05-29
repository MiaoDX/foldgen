# Phase 15: Production Usable Origami Generation

## Goal

Move from "honestly labeled evidence" to at least one genuinely recognizable,
completed, usable origami demo. A completed case must have source provenance,
backend folded states, target-match, full step-state walkthrough, Three.js
rendering, executor overlays, and a hard display decision.

This phase does not chase arbitrary image-to-fold generation. It creates a
production-quality path where known-good tutorials and generated candidates use
the same promotion gate.

## Status

Implemented and verified locally.

Current completed-usable cases:

- `known-good-triangle`
- `known-good-corner`
- `known-good-paper-hat`
- `known-good-square-packet`

`known-good-paper-hat` and `known-good-square-packet` are the recognizable
completed fixtures added for this phase. `known-good-square-packet` is the
multi-step backend-state proof case.

Selected-step walkthroughs now use backend pre/post FOLD artifacts in the demo:
the selected step animates from pre-state to post-state through Three.js/WebGL,
and the selected executor's 3D contact overlay is rendered in the same scene.

Current blockers remain explicit:

- `simple-boat` is `blocked-solver`.
- Origami Simulator automation is `blocked-automated-state-export`.
- Physical execution remains unclaimed and out of scope for this phase.

## Source Of Truth

Canonical plan:
`docs/plans/production-usable-origami-generation.md`.

Foundation:

- `docs/plans/real-usable-origami-generation-pipeline.md`
- `.planning/phases/14-real-usable-origami-generation-pipeline/PLAN.md`

## Product Contract

`completed-usable` requires:

1. promotion-allowed source provenance;
2. structural and community FOLD validation;
3. backend final folded state;
4. Three.js final render from backend state;
5. target-match pass;
6. pre/post state artifacts for every step;
7. visible state change or explicit unchanged-state reason per step;
8. profile-specific executor overlays linked to fold geometry;
9. `display-decision.json` proving every required gate passed.

Anything weaker must be `completed-3d-partial-walkthrough`, `blocked-*`, or
`inspection-only`.

## Implementation Slices

### Slice A: Artifact Graph Lock

Goal: make the artifact graph complete and UI-independent.

Work:

- Normalize per-case artifacts: source, provenance, validation, backend state,
  final render, target-match, step states, executor overlays, and display
  decision.
- Put heuristic previews in an `inspection/` namespace.
- Add tests that incomplete graphs cannot produce `completed-usable`.

Gate:

```bash
npm run m24:artifact-graph
npm test
npm run validate:stage1
```

Status: Implemented.
The selected-step WebGL view animates pre-state to post-state and preserves the
clicked step number.

### Slice B: Recognizable Known-Good Tutorial

Goal: add one recognizable object that passes every hard gate.

Work:

- Try boat only if the full state-backed sequence passes.
- If boat remains blocked, promote another simple recognizable object instead.
- Store provenance/license, step sequence, backend states, target-match,
  renders, and overlays.

Gate:

```bash
npm run m25:recognizable-known-good
npm test
npm run validate:stage1
```

Status: Implemented. Boat remains blocked; paper hat and square packet are the
recognizable completed fixtures.

### Slice C: Progressive State Backend Route

Goal: get real intermediate states for multi-step walkthroughs.

Work:

- Use Flat-Folder where prefix states solve.
- Add validated manual import for simulator-derived states.
- Keep Origami Simulator automation optional until deterministic state export is
  proven.

Gate:

```bash
npm run m26:progressive-state-backend
npm test
npm run validate:stage1
```

Status: Implemented. Manual/known-good backend-state artifacts are accepted with
provenance; automated Origami Simulator solved-state export is still blocked.

### Slice D: 3D Step Walkthrough

Goal: render selected step pre/post states through Three.js.

Work:

- Render selected-step state geometry from backend artifacts.
- Overlay fold line, anchor panel, moving panel, direction, and executor
  contact geometry.
- Preserve selected step number and show only the clicked step.

Gate:

```bash
npm run m27:three-step-walkthrough
npm test
npm run validate:stage1
```

Status: Implemented.

### Slice E: Similarity-Driven Candidate Graduation

Goal: generated candidates graduate only through the same hard gate.

Work:

- Rank candidates by backend success, target-match, step-state completeness,
  overlay completeness, and executor feasibility.
- Store rejected candidates with exact blockers.
- Add a solver-valid wrong-target negative fixture.

Gate:

```bash
npm run m28:candidate-graduation
npm test
npm run validate:stage1
```

Status: Implemented.

### Slice F: Local Preview Review Gate

Goal: make local screenshot review catch blank 3D, wrong step, and decorative
overlay regressions.

Work:

- Add browser review fixtures for completed recognizable object, blocked boat,
  partial walkthrough, and selected executor profiles.
- Save desktop and mobile screenshots to `tmp/qa/`.
- Add canvas-pixel and frame-difference checks.

Gate:

```bash
npm run m29:local-preview-review
npm test
npm run validate:stage1
```

Status: Implemented. Review screenshots are written under `tmp/qa/`.
The local review gate verifies nonblank WebGL, selected-step pre/post frame
differences, profile-specific 3D overlay metadata, and same-step human-hand vs
cat-paw pixel differences.

## Acceptance Criteria

- At least one recognizable object is `completed-usable`.
- At least two simple fixtures remain `completed-usable`.
- Boat is either truly completed or explicitly blocked with exact evidence.
- The demo never uses heuristic preview as a completed result.
- Every completed step view comes from backend pre/post state artifacts.
- Completed and solver-backed step views animate between backend pre/post state
  artifacts in Three.js/WebGL.
- Hand, gripper, cat paw, and dog paw overlays are profile-specific and linked
  to geometry.
- Generated candidates cannot be promoted without passing the same gates as
  known-good tutorials.

Status: Accepted for the software evidence gate. `simple-boat` remains blocked
instead of being falsely promoted.

## Non-goals

- No arbitrary image-to-fold promise.
- No physical execution claim.
- No Rabbit Ear runtime dependency unless GPLv3 is explicitly accepted.
- No completed-usable status from manual screenshots or semantic labels.
