# Real Usable Origami Generation Pipeline Plan

Last checked: 2026-05-29

## Decision

Do not continue polishing schematic-only previews as if they are product
progress. The next product line is a solver-first generation pipeline:

```text
target
  -> candidate crease pattern / known tutorial source
  -> folded-state backend
  -> deterministic 3D render
  -> target similarity gate
  -> per-step state walkthrough
  -> executor overlay
  -> demo display
```

If the pipeline cannot produce the required evidence at any stage, the case is
blocked or inspection-only. It must not be presented as a completed origami
target.

No broad research cycle is needed before implementation. The current stack is
viable for the next product slice if we use the tools for their actual roles:

- FOLD remains the canonical artifact format.
- Flat-Folder remains the first flat-folded-state validation backend.
- Three.js remains the completed-result renderer.
- Origami Simulator becomes a focused integration spike for intermediate
  folding states and richer 3D simulation.
- Rabbit Ear remains a reference or isolated optional adapter unless GPLv3
  licensing is explicitly accepted.

Primary references:

- Flat-Folder: https://github.com/origamimagiro/flat-folder
- Origami Simulator: https://github.com/amandaghassaei/OrigamiSimulator
- Rabbit Ear: https://github.com/rabbit-ear/rabbit-ear

## Why The Current Demo Is Not Enough

The current implementation has useful guardrails, but it is still not a real
usable generation product:

- Solver-backed completed cases are mostly simple fixtures.
- Multi-step cases can be partial because Flat-Folder does not necessarily solve
  every prefix state.
- The lower walkthrough can still become a debug explanation instead of a real
  folding replay.
- Executor hand, gripper, and paw overlays are helpful only if they are
  geometry-linked and action-specific.
- `simple-boat` is correctly blocked today; it should stay blocked until a real
  boat sequence passes the hard gates.

The desired product is not "clearer labels for failures." The desired product
is "completed outputs are actually foldable, visually target-like, and
walkthrough-backed."

## Product Contract

A case can be shown as `completed-usable` only when all required evidence exists:

1. Source artifact exists:
   - either a generated candidate FOLD;
   - or an imported known-good tutorial / crease-pattern source with compatible
     license and provenance.
2. Structural validation passes:
   - repo-local FOLD validation;
   - community `fold` compatibility;
   - face/edge/assignment consistency checks.
3. Folded-state backend passes:
   - Flat-Folder success for flat-foldable state; or
   - approved simulator adapter success for non-flat intermediate/full states.
4. `folded-state.fold` or equivalent simulator state is written.
5. Three.js/WebGL render is generated from that state, not from
   `preview.mjs` heuristic data.
6. Target-match passes:
   - deterministic silhouette/contour gate first;
   - optional perceptual/ML critic later, never as the only proof.
7. Step walkthrough is backed by state evidence:
   - every step has a pre-state and post-state; or
   - the step is explicitly blocked/inspection-only and cannot be part of
     `completed-usable`.
8. Executor overlay is geometry-linked:
   - contact zones reference paper coordinates, fold lines, moving panels, and
     anchors;
   - profile-specific limitations are visible and machine-readable.
9. Batch/demo labels match the weakest evidence:
   - no simulator-valid claim if the solver/simulator gate failed;
   - no target-complete claim if target-match failed;
   - no embodiment claim without physical execution records.

## Display Modes

Replace loose success language with hard modes:

| Mode | Meaning | Demo behavior |
|---|---|---|
| `completed-usable` | Solver/simulator state, target-match, full step states, and overlays all pass. | Main case gallery and default success demos may show it. |
| `completed-3d-partial-walkthrough` | Final 3D target passes, but one or more intermediate steps are inspection-only. | May be shown as technical preview, not as fully usable. |
| `blocked-solver` | Structural validation may pass, but folded-state backend fails. | Show conflict evidence only. |
| `blocked-target-match` | Backend passes, but final shape does not match target. | Show comparison evidence only. |
| `blocked-step-state` | Final state passes, but required walkthrough states are missing. | Show final 3D plus missing-step evidence, not a tutorial. |
| `blocked-executor` | Geometry works, but selected executor profile cannot perform required action. | Show action blocker and possible fixture/tool requirement. |
| `inspection-only` | Debug artifact, heuristic preview, or incomplete source. | Never appears as a completed target. |

## Architecture

### Artifact Graph

Every case should write an explicit evidence graph:

```text
case.json
source.fold
source-provenance.json
structural-validation.json
community-fold-validation.json
solver-state.json
folded-state.fold
render-final.png
target-match.json
step-states.json
step-states/step-N-pre.fold
step-states/step-N-post.fold
executor-overlays/profile/step-N.json
display-decision.json
```

`display-decision.json` is the only artifact the demo can trust for success
state. It records which upstream artifacts were required, which passed, which
failed, and why the final display mode was chosen.

### Backend Roles

Use backends narrowly:

- Flat-Folder:
  - first solver gate for flat-folded states;
  - conflict evidence for invalid crease patterns;
  - no fake recovery when it fails.
- Origami Simulator adapter:
  - focused spike for progressive fold percent, intermediate 3D states, and
    OBJ/FOLD export;
  - useful for multi-step visual walkthroughs where Flat-Folder prefix solving
    is too brittle.
- Three.js:
  - deterministic local rendering from folded/simulator state;
  - screenshot and canvas-pixel gates for nonblank, in-frame, mobile/desktop
    previews.
- `preview.mjs`:
  - debug-only inspection preview;
  - never a completed-result source.

### Search Loop

Generation must be score-driven:

```text
for target:
  create candidates from operations, known bases, and imported sources
  reject structurally invalid candidates
  run folded-state backend
  render backend state
  score target-match
  build step-state walkthrough
  build executor overlays
  choose the best candidate only if all hard gates pass
```

The search result must include rejected candidates. Rejections are valuable
training and debugging data, but they cannot be surfaced as completed examples.

## Implementation Phases

### Phase A: Hard Display Decision Artifact

Goal: make overclaiming structurally impossible.

Work:

- Add `display-decision.json` per case.
- Make the demo read completion status only from `display-decision.json`.
- Downgrade `simple-fish` from fully usable if any step remains
  inspection-only.
- Keep `simple-boat` blocked until a real boat passes.
- Add tests that fail if a missing artifact still produces success UI.

Gate:

```bash
npm run m18:display-decision
npm test
npm run validate:stage1
```

Acceptance:

- No completed card can render without `folded-state.fold`, target-match pass,
  complete step states, and profile overlays.
- Existing heuristic previews appear only under `inspection-only`.

### Phase B: Origami Simulator Adapter Spike

Goal: decide whether Origami Simulator can provide the missing progressive
state backend for multi-step walkthroughs.

Work:

- Create an isolated adapter package or script.
- Import a small known-good FOLD/SVG case.
- Drive fold percent or equivalent simulator state deterministically.
- Export intermediate state artifacts.
- Render those artifacts in the existing Three.js preview.
- Document whether this should become production backend, manual fixture tool,
  or be rejected.

Gate:

```bash
npm run m19:origami-simulator-spike
npm test
```

Acceptance:

- At least one multi-step case has two visibly different simulator-backed
  intermediate states; or
- the adapter records a concrete blocker and the plan switches to imported
  tutorial states.

### Phase C: Known-Good Tutorial Case Set

Goal: stop using weak generated cue sequences as product demos.

Work:

- Add a small curated set of genuinely foldable tutorial cases:
  - one simple single-fold fixture;
  - one two-to-four-step geometric object;
  - one recognizable object such as a boat only if it passes all gates.
- Store provenance/license for each source.
- Convert each source into the artifact graph.
- Keep generated candidates separate from known-good imported cases.

Gate:

```bash
npm run m20:known-good-tutorials
npm test
npm run validate:stage1
```

Acceptance:

- At least two cases are `completed-usable`.
- A recognizable object is not promoted unless target-match and full step-state
  gates pass.
- Failed boat remains blocked with exact failure evidence.

### Phase D: Full Step-State Walkthrough

Goal: the bottom panel becomes a real folding replay.

Work:

- Require every tutorial step to reference pre-state and post-state artifacts.
- Render step visuals from those states.
- Add frame-difference checks between adjacent states.
- Keep original step numbering when a step is clicked.
- Show only the selected step detail, never copied content from step 1.

Gate:

```bash
npm run m21:full-step-states
npm test
npm run validate:stage1
```

Acceptance:

- Step 1 and step 4 cannot look identical unless the artifact explicitly marks
  the step as intentionally unchanged.
- Clicking step N renders step N only.
- Missing state evidence downgrades the case to `blocked-step-state`.

### Phase E: Executor Overlay Artifacts

Goal: hand, gripper, cat paw, and dog paw visuals become action evidence rather
than decoration.

Work:

- Generate `executor-overlays/<profile>/step-N.json`.
- Bind each overlay to:
  - fold line;
  - anchor face/panel;
  - moving face/panel;
  - contact zone;
  - direction vector;
  - precision/risk notes.
- Render overlays inside the step state view.
- Mark paw profiles blocked when a required pinch, inside reverse fold, or
  precision squash cannot be represented.

Gate:

```bash
npm run m22:executor-overlay-artifacts
npm test
npm run validate:stage1
```

Acceptance:

- Human, gripper, cat paw, and dog paw overlays differ in geometry and
  limitations.
- Decorative side images are optional and cannot satisfy the overlay gate.
- Executor limitations can downgrade only that profile without invalidating the
  underlying geometry case.

### Phase F: Solver-Backed Candidate Search

Goal: generated outputs become candidates selected by evidence, not by curated
semantic names.

Work:

- Extend candidate generation from known bases, operation libraries, and
  imported tutorial sources.
- Score every candidate with solver/simulator pass, render target-match, and
  walkthrough completeness.
- Persist all candidate scores and blockers.
- Select only candidates that pass the hard gate for the requested display
  mode.

Gate:

```bash
npm run m23:solver-backed-search
npm test
npm run validate:stage1
```

Acceptance:

- Search cannot select a candidate that failed the backend.
- Search cannot select a target-mismatched candidate as completed.
- Search result, preview, walkthrough, and downloads all reference the same
  candidate id.

## Boat Policy

Boat is the canonical failure case and should be treated as a product gate.

Allowed outcomes:

1. `completed-usable`: only if a known-good or generated boat passes all gates.
2. `blocked-solver`: if crease pattern cannot produce a folded state.
3. `blocked-target-match`: if it folds but does not look like a boat.
4. `blocked-step-state`: if final state works but walkthrough states are
   missing.

Disallowed outcome:

- showing a boat label with a non-boat final shape or repeated schematic steps.

## Verification Matrix

| Risk | Required proof |
|---|---|
| UI claims success from a heuristic preview | `display-decision.json` requires backend state and target-match artifacts. |
| Final result does not resemble target | deterministic target-match gate blocks display. |
| Step panel repeats the same content | per-step state artifacts and selected-step tests. |
| Step differences are invisible | frame-difference gate and screenshot checks. |
| 3D preview is decorative or blank | canvas-pixel and screenshot gates. |
| Executor visuals are decorative | overlay JSON must bind to fold geometry. |
| Paw/gripper capabilities are overstated | profile-specific blocker gate. |
| Boat stays fake-successful | boat policy test forbids completed mode without all evidence. |

## Done Definition

This plan is done when:

- `completed-usable` exists and is enforced by code.
- At least two local demo cases are `completed-usable`.
- At least one recognizable object either passes as `completed-usable` or is
  visibly blocked with evidence.
- The demo's primary completed preview renders from backend state through
  Three.js.
- The walkthrough panel renders selected step pre/post state, fold action, and
  executor overlay from artifacts.
- All blocked cases are still useful: they show the exact failed gate, not a
  fake tutorial.
- `npm test`, `npm run validate:stage1`, and all new phase gates pass.

## Open Decisions

These should be answered during the implementation phases, not before them:

- Whether Origami Simulator is stable enough as an automated backend, or should
  remain a fixture-generation tool.
- Which recognizable object becomes the first `completed-usable` non-geometric
  demo. Boat is preferred only if it can pass the gate.
- Whether GPLv3 Rabbit Ear functionality is acceptable as an optional isolated
  tool. It should not enter the core runtime by accident.
