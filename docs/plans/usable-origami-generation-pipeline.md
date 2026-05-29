# Usable Origami Generation Pipeline Plan

Last checked: 2026-05-29

Implementation update: Phase 13 display hardening, Phase 14 known-good
target promotion, and Phase 15 step-state walkthrough foundation are
implemented. Case summaries now carry explicit
`display_mode`, the demo renders completed vs blocked states from that field,
step details preserve the clicked step number, ambiguous dashed helper lines
were removed from step SVGs, and step visual artifacts include
profile-specific executor overlays plus annotation legends. The default
pipeline now has three completed targets: `known-good-triangle`,
`known-good-corner`, and `simple-fish`; `simple-boat` remains blocked by solver
evidence. Step walkthroughs now write `step-states.json`; known-good targets
have solver-backed post-state walkthrough steps, while multi-step cases record
which prefixes remain inspection-only.

## Decision

Do not spend another broad research cycle before implementation. The current
technology stack is viable if it is treated correctly:

- FOLD remains the canonical interchange format.
- Flat-Folder is the first solver-backed folded-state gate.
- Three.js/WebGL is the demo renderer for completed cases.
- Target matching is an artifact-backed gate, not a visual impression.
- Origami Simulator stays a reference/optional adapter until the integration
  boundary is clean.
- Rabbit Ear stays out of the core runtime unless GPLv3 implications are
  explicitly accepted.

The problem is not that React/canvas/Node cannot support the product. The
problem is that the old demo used repo-local heuristic preview data as if it
were folded-result evidence.

## Product Contract

A case is `completed` only when all of these artifacts exist and pass:

1. `fold.fold` passes repo-local FOLD validation.
2. community FOLD compatibility passes.
3. Flat-Folder validation passes.
4. `flat-folder-state.json` is `passed`.
5. `folded-state.fold` exists and is the source of the final preview.
6. `target-match.json` passes its threshold.
7. completed-result UI renders Three.js/WebGL from `folded-state.fold`.
8. step walkthrough data references the same fold sequence and geometry family.

If any item fails, the case must be `blocked` or `inspection-only`. It may show
debug diagrams, conflict evidence, and 2.5D inspection previews, but it must not
be presented as a folded target.

## Current State

Implemented locally:

- Flat-Folder solver-state artifact extraction.
- `target-match.json` silhouette gate.
- completed-target status now requires solver-state and target-match pass.
- Three.js/WebGL completed preview for solver-backed completed cases.
- 2D inspection fallback for blocked cases.

Observed case truth:

| Case | Current truth |
|---|---|
| `known-good-triangle` | completed: solver-backed, target-match passed, WebGL preview available |
| `known-good-corner` | completed: solver-backed, target-match passed, WebGL preview available |
| `simple-fish` | completed: solver-backed, target-match passed, WebGL preview available |
| `simple-flower` | blocked: solver-backed state exists, target-match failed |
| `simple-boat` | blocked: Flat-Folder taco-taco conflict |
| `simple-bird` | blocked: Flat-Folder failed |
| `simple-star` | blocked: Flat-Folder failed |

This is better than the old demo because it stops overclaiming and now has a
small known-good completed set. It is still not the finished product because the
step walkthrough visuals are not yet driven by per-step folded states.

## Implementation Phases

### Phase 13: Completed-result gate hardening

Goal: make it impossible for a blocked or inspection-only case to look like a
completed origami result in artifacts or the demo.

Status: Implemented.

Work:

- Add an explicit `display_mode` per case:
  - `completed-3d`
  - `blocked-solver`
  - `blocked-target-match`
  - `inspection-only`
- Make the demo choose the main preview panel only from `display_mode`.
- Hide or visually separate the 2.5D inspection canvas when a completed 3D
  folded-state render is available.
- Ensure selected-step details preserve the original step number and show only
  the clicked step.
- Remove always-on ambiguous helper lines from step diagrams unless the current
  step needs them; crease/reference lines must carry a label or legend entry in
  the artifact data.

Gate:

```bash
npm run m13:display-modes
npm run m13:three-preview
npm test
npm run validate:stage1
```

Acceptance:

- `simple-fish` uses `completed-3d`.
- `simple-boat` uses `blocked-solver` and cannot show a completed panel.
- Clicking step 5 renders step 5 content only and preserves `Step 5`.
- Blue or dashed reference lines have explicit artifact semantics or are absent.

Verified:

- `npm run m13:display-modes`
- `npm run m13:three-preview`
- `npm run m12:solver-state`
- `npm test`
- `npm run validate:stage1`
- Browser screenshots:
  - `tmp/qa/foldgen-fish-three-preview.png`
  - `tmp/qa/foldgen-boat-blocked-preview.png`
  - `tmp/qa/foldgen-fish-step-four-cat-overlay.png`

### Phase 14: Known-good target set

Goal: replace weak curated cue cases with a small set of known-good,
solver-backed targets.

Status: Implemented for the first known-good target set. The current completed
set is intentionally simple and solver-derived; richer target geometry and a
real boat remain future work.

Work:

- Promote only cases with solver-state plus target-match pass into the completed
  target set.
- For `simple-boat`, do one of:
  - author a known-good boat FOLD/sequence that passes Flat-Folder and target
    match, or
  - keep boat visibly blocked and remove it from default completed examples.
- Add at least three completed targets before using plural completed-results
  language in the UI or README.
- Store rejected case records with exact blocker reason so failures remain
  useful training/evaluation data.

Gate:

```bash
npm run m14:known-good-targets
npm test
npm run validate:stage1
```

Acceptance:

- At least three curated targets are completed by the hard gate.
- Boat is completed only if it actually passes solver-state and target-match.
- Batch summary cannot say `simulator-valid` when any default completed target
  fails the completed gate.

Verified:

- `npm run m14:known-good-targets`
- `npm run m12:solver-state`
- `npm test`
- `npm run validate:stage1`

Current evidence:

- `known-good-triangle`: target-match score `1.0`
- `known-good-corner`: target-match score `1.0`
- `simple-fish`: target-match score `0.5304`
- `simple-boat`: still `blocked-solver`

### Phase 15: Step-state walkthrough

Goal: the lower walkthrough panel visualizes the intermediate folding process,
not the same base diagram with extra cues.

Status: Implemented as a foundation. Per-step post-state artifacts are written
and used in step visuals when Flat-Folder can solve the prefix. Known-good
single-step targets are fully solver-backed. Multi-step `simple-fish` has a
solver-backed final post-state and inspection-only intermediate prefixes because
Flat-Folder currently fails those prefixes.

Work:

- Generate per-step `pre_state` and `post_state` artifacts when the backend can
  solve or simulate them.
- Render step visuals from those artifacts rather than from `preview.mjs`.
- When a real intermediate state is unavailable, mark that step
  `inspection-only` and explain the missing backend artifact in machine-readable
  data.
- Add frame-difference checks so steps that claim geometry changed must produce
  a measurable render change.

Gate:

```bash
npm run m15:step-state-walkthrough
npm test
npm run validate:stage1
```

Acceptance:

- Step 1 and step 4 for any completed case differ visibly or the artifact says
  why the geometry is intentionally unchanged.
- Step visuals are sourced from solver/simulator state artifacts for completed
  cases.
- 2.5D heuristic previews remain only debug/inspection assets.

Verified:

- `npm run m15:step-state-walkthrough`
- `npm run m13:three-preview`
- `npm run m12:solver-state`
- `npm test`
- `npm run validate:stage1`

Current evidence:

- `known-good-triangle`: `step_state_status = complete`, `1/1`
  solver-backed steps, frame difference `changed`.
- `known-good-corner`: `step_state_status = complete`, `1/1`
  solver-backed steps, frame difference `changed`.
- `simple-fish`: `step_state_status = partial`, `1/4` solver-backed steps;
  steps 1-3 are explicitly inspection-only because Flat-Folder cannot solve
  those intermediate prefixes.

### Phase 16: Executor contact overlays

Goal: human hand, gripper, cat paw, and dog paw are visible contact models tied
to fold geometry, not decorative side images.

Work:

- Add `executor_overlay.json` per profile and step:
  - contact primitive type
  - contact zones in normalized paper coordinates
  - anchor zones
  - moving panel zones
  - blocked or fixture-needed actions
- Render overlays inside the step visual:
  - human hand: fingertip/palm contact primitives
  - two-finger gripper: two-jaw pinch/contact primitives
  - cat paw/dog paw: broad pad zones and occlusion/risk zones
- Make unsupported precision operations visibly blocked for paw profiles.
- Keep side images optional; they cannot be the executor evidence.

Gate:

```bash
npm run m16:executor-overlays
npm test
npm run validate:stage1
```

Acceptance:

- The same step looks materially different for human hand, gripper, cat paw,
  and dog paw.
- Cat/dog paw profiles show broad contact zones and blocked precision actions.
- Tests assert profile-specific overlay artifacts differ and reference the step
  geometry.

### Phase 17: Similarity-driven generation loop

Goal: generation selects candidates by solver-backed visual result, not by
operation names or curated target cues.

Work:

- Change search loop to:

```text
candidate crease pattern
  -> local validation
  -> solver-state extraction
  -> target render
  -> target-match score
  -> executor-step feasibility
  -> selected candidate
```

- Reject candidates before display when any hard gate fails.
- Keep curated fixtures as seeds, not as proof.
- Record failed candidates with solver and target-match reasons.

Gate:

```bash
npm run m17:solver-search
npm test
npm run validate:stage1
```

Acceptance:

- Candidate ranking uses target-match scores from solver-backed renders.
- A wrong-but-solver-valid shape fails target match and is not selected.
- The selected candidate's demo preview, step walkthrough, and downloadable
  artifacts all reference the same selected candidate id.

## Done Definition

This plan is done when the default local demo can show multiple completed
targets whose final result is solver-backed, target-matched, and rendered in
Three.js/WebGL, while every blocked case is visibly blocked with evidence. The
step panel must show real intermediate state changes where available, and
executor hand/paw/gripper overlays must be geometry-linked rather than
decorative.

The product is still `embodiment-untested` until physical executor records
exist.

## Verification Matrix

| User-visible failure | Gate that prevents it |
|---|---|
| Boat looks unlike a boat but is shown as success | solver-state + target-match + completed display gate |
| Step 1 and 4 look the same | per-step state artifacts + frame-difference check |
| Click step 5 but lower panel shows step 1 | selected-step UI test |
| Blue dashed line has no meaning | annotation semantics test |
| No real 3D | WebGL canvas screenshot and pixel checks |
| Hand/paw visuals are decorative | profile overlay artifact tests |
| Pipeline still picks curated cues | solver-search target-match ranking |
