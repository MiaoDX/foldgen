# Production Usable Origami Generation Plan

Last checked: 2026-05-29

## Implementation Update

Phase 15 is implemented and locally verified. The product boundary is now:
`completed-usable` is allowed only for cases with promotion-allowed provenance,
backend folded state, deterministic target match, full step states, Three.js
render evidence, executor overlay artifacts, and a passing display decision.

Current completed-usable cases:

- `known-good-triangle`
- `known-good-corner`
- `known-good-paper-hat`
- `known-good-square-packet`

`known-good-paper-hat` and `known-good-square-packet` are the recognizable
known-good fixtures added for this production slice. `known-good-square-packet`
is the multi-step proof case: it has two validated backend-backed step states
and drives the selected-step walkthrough gate.

The selected-step walkthrough is now pre/post state backed in the demo:
completed or solver-backed steps load the step pre-state FOLD and post-state
FOLD, animate between them in Three.js/WebGL, and render the selected executor's
3D contact overlay in the same scene. The local preview review gate verifies
nonblank WebGL, selected step number preservation, pre/post frame differences,
and executor-profile-specific pixel differences for the same step.

Current non-completed cases remain honest:

- `simple-fish`: `completed-3d-partial-walkthrough`
- `simple-bird`: `blocked-solver`
- `simple-flower`: `blocked-target-match`
- `simple-boat`: `blocked-solver`
- `simple-star`: `blocked-solver`

Origami Simulator automation remains blocked as a deterministic solved-state
export backend. The accepted route for this phase is validated known-good or
manual/imported state artifacts with provenance and checksums. Boat is not a
completed demo and must stay blocked until a real state-backed sequence passes
the same gates.

## Decision

There is no value in another broad research loop before implementation. The
current stack can support the next slice if we stop asking the schematic
pipeline to pretend it is a geometry engine.

Use the stack this way:

- FOLD remains the canonical artifact format.
- Flat-Folder remains the hard flat-folded-state gate where it applies.
- Three.js/WebGL remains the only completed-result renderer in the demo.
- Origami Simulator is treated as a state-generation/import route, not a
  completed backend, until deterministic export automation exists.
- Rabbit Ear stays out of the core runtime unless GPLv3 is explicitly accepted.
- The current 2.5D preview remains debug-only and cannot participate in
  completed output.

The next milestone is not "make the boat screenshot less bad." It is:

```text
known foldable source or generated candidate
  -> backend folded states
  -> target-like 3D render
  -> complete step-state walkthrough
  -> executor contact overlays
  -> display only if every required artifact passes
```

## Product Contract

A case may be shown as `completed-usable` only when all of these are true:

1. Source provenance is recorded and promotion-allowed.
2. FOLD structural validation passes.
3. Community FOLD compatibility passes.
4. A folded-state backend writes final state artifacts.
5. The final Three.js render is built from backend state artifacts.
6. Target-match passes against a deterministic SVG/silhouette fixture.
7. Every tutorial step has pre-state and post-state artifacts.
8. Each step produces visible geometric change or an explicit unchanged-state
   reason.
9. Human hand, gripper, cat paw, and dog paw overlays reference fold geometry.
10. `display-decision.json` records every gate and is the only source the demo
    trusts for completed display.

Anything weaker is `completed-3d-partial-walkthrough`, `blocked-*`, or
`inspection-only`.

## Key Scope Choice

Do not promise arbitrary image-to-fold generation yet.

For the next usable product slice, use two tracks:

- `known-good` track: imported or repo-authored tutorials with provenance,
  step sequence, and state artifacts. This is the only track allowed to create
  recognizable completed demos in the short term.
- `generated-candidate` track: local search over candidate crease patterns. It
  can graduate only when solver/simulator state, target-match, full step-state,
  and overlay gates pass. Rejected candidates remain evidence, not demos.

This keeps the product honest: recognizable objects come from sources we can
prove, while generation improves behind the same gates.

## Implementation Slices

### Slice A: Artifact Graph Lock

Goal: make the artifact graph explicit enough that no UI code can infer success
from names, labels, or screenshots.

Work:

- Normalize per-case artifacts under a stable directory contract:

```text
case.json
source.fold
source-provenance.json
structural-validation.json
community-fold-validation.json
backend-state.json
folded-state.fold
render-final.png
target-match.json
step-states.json
step-states/step-N-pre.fold
step-states/step-N-post.fold
executor-overlays/<profile>/step-N.json
display-decision.json
```

- Fail `completed-usable` when any required file is missing.
- Make artifact paths include selected candidate or tutorial ids.
- Keep heuristic previews in a separate `inspection/` namespace.

Gate:

```bash
npm run m24:artifact-graph
npm test
npm run validate:stage1
```

Acceptance:

- A case with missing final state, missing step state, or missing overlay cannot
  produce `completed-usable`.
- Demo code can decide completed display from `display-decision.json` alone.
- Tests cover a deliberately incomplete artifact graph.

Status: Implemented and verified with `npm run m24:artifact-graph`.

### Slice B: Recognizable Known-Good Tutorial

Goal: add one recognizable object that actually passes every hard gate.

Work:

- Pick one simple recognizable object with low geometric ambiguity:
  - first choice: traditional boat only if a full state-backed sequence passes;
  - fallback: simple house, cup, or kite-like object if boat remains blocked.
- Store provenance and license information.
- Author or import the tutorial as a step sequence with FOLD artifacts.
- Generate final backend state, target-match, step pre/post states, renders, and
  overlays.
- Promote it only when `display_mode = completed-usable`.

Gate:

```bash
npm run m25:recognizable-known-good
npm test
npm run validate:stage1
```

Acceptance:

- At least one recognizable object is `completed-usable`.
- If boat does not pass, the plan records the exact blocker and promotes a
  different recognizable object instead.
- The default demo includes only recognizable cases that passed every gate.

Status: Implemented and verified with
`npm run m25:recognizable-known-good`. Boat remains `blocked-solver`; the
recognizable completed fixtures are `known-good-paper-hat` and
`known-good-square-packet`.

### Slice C: Progressive State Backend Route

Goal: replace inspection-only intermediate steps with real state transitions.

Work:

- Keep Flat-Folder for flat-foldable prefix states.
- Add a manual import format for simulator-derived states:
  - `simulator-state.json`
  - `simulator-state.obj` or `simulator-state.fold`
  - source tool, version, import settings, export settings, and checksum.
- If Origami Simulator automation is attempted, require a deterministic script
  that imports, drives fold percent, waits for convergence, exports states, and
  reproduces the same artifacts locally.
- Treat manual simulator imports as valid only when provenance and checksum are
  recorded.

Gate:

```bash
npm run m26:progressive-state-backend
npm test
npm run validate:stage1
```

Acceptance:

- A multi-step case has at least two visibly different backend-backed
  intermediate states.
- If automation is still blocked, manual fixture import is documented and
  validated as the accepted route.
- No intermediate step can silently fall back to 2.5D while still claiming
  `completed-usable`.

Status: Implemented and verified with
`npm run m26:progressive-state-backend`. `known-good-square-packet` is the
multi-step backend-state proof. Origami Simulator automation is still
`blocked-automated-state-export`.

### Slice D: 3D Step Walkthrough

Goal: the lower panel becomes a real selected-step 3D/state replay.

Work:

- Render selected step pre/post states through the same Three.js path as the
  final preview.
- Show fold line, moving panel, anchor panel, direction, and contact overlay in
  the selected step view.
- Preserve original step numbering and show only the selected step.
- Add screenshot and frame-difference checks for desktop and mobile.

Gate:

```bash
npm run m27:three-step-walkthrough
npm test
npm run validate:stage1
```

Acceptance:

- Clicking step 5 shows step 5 only and keeps the number `Step 5`.
- Step 1 and step 4 differ when their backend states differ.
- If a state is unchanged, the artifact contains the reason and the UI does not
  imply motion.

Status: Implemented and verified with `npm run m27:three-step-walkthrough`.
The demo renders selected solver-backed steps from pre/post FOLD artifacts
through Three.js/WebGL rather than showing only the post-state.

### Slice E: Similarity-Driven Candidate Graduation

Goal: generated candidates can become real demos only through the same evidence
chain as known-good tutorials.

Work:

- Rank candidates by:
  - structural validity;
  - backend-state success;
  - target-match score;
  - step-state completeness;
  - executor-overlay completeness;
  - profile feasibility.
- Store rejected candidate records with blockers.
- Promote no generated candidate unless it passes the completed-usable gate.
- Add a wrong-but-solver-valid negative fixture to prove target-match blocks it.

Gate:

```bash
npm run m28:candidate-graduation
npm test
npm run validate:stage1
```

Acceptance:

- Search never selects by target label or operation name alone.
- A solver-valid shape that does not look like the target is blocked by
  `blocked-target-match`.
- Downloads, preview, walkthrough, and display decision all reference the same
  selected candidate id.

Status: Implemented and verified with `npm run m28:candidate-graduation`.

### Slice F: Local Preview Review Gate

Goal: catch the exact class of visual failures that started this thread before
they reach the user.

Work:

- Add browser review fixtures for:
  - completed-known-good recognizable object;
  - blocked boat;
  - partial walkthrough case;
  - selected step with hand/gripper/paw overlay.
- Save desktop and mobile screenshots under `tmp/qa/`.
- Add canvas-pixel checks for nonblank WebGL, in-frame geometry, and changed
  step states.

Gate:

```bash
npm run m29:local-preview-review
npm test
npm run validate:stage1
```

Acceptance:

- QA screenshots prove completed demos have real 3D geometry.
- Blocked cases cannot visually resemble success cards.
- Paw/hand/gripper overlays are visible in the step view and differ by profile.

Status: Implemented and verified with `npm run m29:local-preview-review`.
Screenshots are written under `tmp/qa/`, including
`foldgen-square-packet-completed-usable.png`.
The gate also verifies animated selected-step WebGL frames and compares
same-step human-hand vs cat-paw WebGL pixel hashes so executor overlays cannot
silently collapse to identical visuals.

## Done Definition

This plan is complete when the local demo can show at least one recognizable
`completed-usable` object and at least two simple completed fixtures, all backed
by final folded state, target-match, full step states, 3D renders, and executor
overlay artifacts.

`simple-boat` is allowed to remain blocked, but only with exact solver or state
evidence. It is not allowed to appear as a completed boat until every gate
passes.

The product remains `embodiment-untested` until real physical execution records
exist.

Status: Complete for the software evidence gate. Physical execution remains out
of scope and unclaimed.

## Verification Matrix

| Failure | Required gate |
|---|---|
| Screenshot looks unlike the target | target-match plus local preview review |
| Step 1 and step 4 look identical | backend step states plus frame diff |
| Step panel shows the wrong step | selected-step UI test |
| 3D view is decorative or blank | Three.js source artifact plus pixel checks |
| Hand or paw is decorative | executor overlay artifact references geometry |
| Step walkthrough is only a static post-state | pre/post FOLD animation plus frame-difference pixel checks |
| Executor profiles render the same 3D overlay | same-step profile pixel-hash comparison |
| Generated cue is mistaken for real output | candidate graduation gate |
| Boat is shown as successful while invalid | display decision gate |
