# Solver-backed Real Folding Pipeline Plan

Last checked: 2026-05-29

Implementation update: Phase 12 and the first Phase 13 slice are implemented.
The pipeline now writes Flat-Folder solver-state artifacts, target-match
artifacts, and blocks completed-target display unless both gates pass. The demo
uses Three.js/WebGL for solver-backed completed cases and keeps 2D inspection as
fallback for blocked cases. Phase 15 executor hand/paw/gripper overlays remain
open.

## Why This Plan Exists

The current demo is not a real folded-result pipeline. It produces
executor-readable schematic steps and a deterministic 2.5D inspection preview,
but it does not prove that the shown target can be folded into the rendered
shape.

The user-facing failure is visible in `simple-boat`: the final preview does not
look like a boat, step changes are subtle, and the selected case can still be
presented as a walkthrough even when external Flat-Folder validation fails.

This plan replaces that behavior with a hard evidence chain:

```text
candidate fold artifact
  -> solver-backed folded state
  -> real 3D render
  -> target-match score
  -> executor-readable steps
  -> demo display only if gates pass
```

The goal is not to add clearer disclaimers. The goal is to stop showing
schematic folds as completed target results.

## Current Failure, Plainly

- `packages/fold-core/src/preview.mjs` is a local 2.5D heuristic. It moves
  vertices for inspection, but it is not an origami geometry solver.
- `flat-folder` currently writes validation records; it does not drive the
  final preview or selected case gate.
- The demo canvas is not Three.js/WebGL and does not render layer order,
  folded-state faces, collision evidence, or a solver-selected state.
- Target-to-sequence selection is curated semantic cueing. It is not generating
  a proven fold sequence that matches the target.
- `simple-boat` currently fails Flat-Folder validation and should not be shown
  as a successful folded result.

## External Tool Decisions

Use these as implementation constraints, not open-ended research questions:

- Keep FOLD as the canonical artifact format.
- Use Flat-Folder as the first solver-backed folded-state gate. It is a crease
  pattern solver that can compute flat-folded states and export folded-state
  FOLD records.
- Use Three.js/WebGL for the in-demo 3D renderer.
- Keep Origami Simulator as a manual or automated reference route. Its public
  app supports FOLD/SVG import and folded-state export, but embedding it should
  be optional until the integration boundary is clean.
- Do not make Rabbit Ear a core runtime dependency until GPLv3 implications are
  explicitly accepted. It can remain a reference or isolated optional adapter.

Sources:

- Flat-Folder: https://github.com/origamimagiro/flat-folder
- Origami Simulator: https://origamisimulator.org/
- Origami Simulator repo: https://github.com/amandaghassaei/OrigamiSimulator
- Rabbit Ear: https://github.com/rabbit-ear/rabbit-ear

## Product Contract

A case can be shown as a completed target only when all of these are true:

1. The FOLD artifact passes repo-local structural validation.
2. The artifact passes an external solver gate.
3. The pipeline writes a solver-backed folded-state artifact.
4. The 3D preview is rendered from that folded-state artifact, not from local
   heuristic preview data.
5. The target-match gate passes against the target image or approved silhouette
   fixture.
6. Executor steps are generated from the same selected fold sequence and are
   marked with unsupported actions per executor profile.

If any gate fails, the demo must show the case as an invalid/inspection case,
not as a completed origami result.

## Non-goals

- No physical executor claim. `embodiment-untested` remains unless real
  embodiment records exist.
- No new origami simulator.
- No textual DSL.
- No broad internet-driven benchmark chase.
- No live paid model dependency for the first implementation slice.

## Implementation Phases

### Phase 12: Solver-backed folded state MVP

Goal: one target, preferably boat, renders from solver-backed folded-state
geometry and cannot bypass the solver gate.

Work:

- Add a `flat-folder-state` adapter that returns:
  - normalized solver input FOLD
  - solver status
  - folded vertex coordinates
  - face flip/layer order data when available
  - folded-state FOLD output
  - component/state count
  - errors with conflict faces when solving fails
- Replace the current `simple-boat` cue sequence with a known-good public or
  repo-authored boat fixture. If a known-good boat cannot be created quickly,
  remove boat from the success set until it passes.
- Add `result_quality.target_match_status` values that distinguish:
  - `target-match-passed`
  - `target-match-failed`
  - `target-match-unscored`
- Add a hard pipeline rule: `status: valid` requires external solver pass for
  completed-target cases.
- Keep the existing 2.5D preview only as `inspection_preview`, never as final
  folded result.

Gate:

```bash
npm run m12:solver-state
npm test
npm run validate:stage1
```

Acceptance:

- `out/m12-solver-state/simple-boat/folded-state.fold` exists for the selected
  boat case, or boat is explicitly removed from completed targets.
- A failed Flat-Folder case cannot be reported as completed target output.
- Tests prove the demo summary and pipeline case status cannot claim target
  success without solver-backed state.

### Phase 13: Real 3D renderer

Goal: the demo preview is a WebGL/Three.js render of folded-state geometry.

Work:

- Add Three.js to the demo.
- Render solver-backed folded-state faces as a mesh with stable camera,
  lighting, face colors, crease overlays, and layer visual cues.
- Add a step scrubber that renders intermediate states only when they are
  backed by solver/simulator data. Otherwise show the inspection preview as a
  clearly separate debug view.
- Add Playwright or equivalent screenshot checks for desktop and mobile:
  - WebGL canvas is nonblank
  - target mesh is in frame
  - selected step changes the mesh or shows a deliberate unchanged-state reason
  - UI text does not overlap the canvas or controls

Gate:

```bash
npm run m13:three-preview
npm test
npm run validate:stage1
```

Acceptance:

- The main demo preview no longer uses `preview.mjs` for completed cases.
- A case without folded-state geometry cannot show the 3D completed-result
  panel.
- Screenshots are saved under `tmp/qa/` for local review.

### Phase 14: Target-match gate

Goal: target likeness becomes an artifact-backed gate instead of a manually
trusted cue.

Work:

- Render final solver-backed state to a deterministic image.
- Compare against target fixtures using a cheap first gate:
  - silhouette overlap / contour IoU for SVG targets
  - optional CLIP or MLLM critic later, but not required for the first gate
- Store `target-match.json` with score, threshold, target image path, render
  path, and decision.
- Reject selected candidates that pass the solver but fail target match.
- Make the critic/search layer optimize this score instead of operation names.

Gate:

```bash
npm run m14:target-match
npm test
npm run validate:stage1
```

Acceptance:

- Boat must pass a target-match threshold before it appears as completed.
- A deliberately wrong solver-valid shape fails target match in tests.
- UI surfaces the target-match artifact and score.

### Phase 15: Executor visual walkthrough from real states

Goal: the lower step panel teaches the same fold state the 3D renderer shows.

Work:

- Generate step visuals from pre/post folded-state or simulator-state data.
- Overlay fold line, motion arrow, contact zones, anchor points, and executor
  limitations for each selected profile.
- For cat/dog paw profiles, show broad contact zones and unsupported precision
  steps as blocked or fixture-needed instead of pretending a paw can perform
  pinches.
- Preserve step numbering and step-specific details in the UI.

Gate:

```bash
npm run m15:walkthrough-real-state
npm test
npm run validate:stage1
```

Acceptance:

- Clicking step 5 shows only step 5 details, with original numbering preserved.
- Step visuals are tied to the same geometry artifact as the 3D preview.
- Executor-specific hand/paw/gripper visuals are overlays on the fold state,
  not decorative side images.

## First Slice Recommendation

Start with `simple-boat`, because it is the clearest current failure. Do not
spend more time polishing the current heuristic preview.

The first commit should be small and binary:

- either a solver-backed boat state is generated and rendered from that state,
- or boat is removed from the completed set and marked blocked by solver/target
  evidence.

That forces the pipeline to stop pretending.

## Verification Matrix

| Risk | Required proof |
|---|---|
| Heuristic preview is mistaken for result | Completed cases use folded-state artifacts only |
| Solver failure hidden by local validation | Pipeline valid status requires external solver pass |
| Boat still does not look like boat | Target-match artifact must pass threshold |
| UI shows wrong step details | Step click tests assert selected step number and detail |
| 3D preview is blank or decorative | Browser screenshot and canvas-pixel checks |
| Executor visuals become decorative | Step visual artifacts reference contact zones and fold geometry |

## Done Definition

This plan is done when the demo can show at least one target as a completed
origami result using solver-backed folded-state geometry, a WebGL 3D preview,
and a passing target-match artifact. All other cases must be honestly blocked,
inspection-only, or unscored.
