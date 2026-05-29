# Phase 16: Generated Usable Origami Graduation

## Goal

Move from known-good fixture success to evidence-backed generated success. A
generated candidate can become a product demo only when it passes backend state,
target match, full step replay, executor feasibility, Three.js preview, and
local QA gates.

This phase is allowed to end with generated candidates rejected or blocked. It
is not allowed to create another fake completed target.

## Status

Implemented and verified locally.

Current generated graduate:

- `generated-triangle`: `completed-usable-generated`

Current protected failure:

- `simple-boat`: `blocked-solver`

`generated-triangle` has reproducible recipe/run artifacts, backend folded
state, target-match, full step replay, executor feasibility artifacts, and
browser QA evidence. Boat remains blocked and cannot render as completed.

## Source Of Truth

Canonical plan:
`docs/plans/generated-usable-origami-graduation.md`.

Foundation:

- `docs/plans/production-usable-origami-generation.md`
- `.planning/phases/15-production-usable-origami-generation/PLAN.md`

## Product Contract

`completed-usable-generated` requires:

1. reproducible candidate recipe and selected candidate id;
2. structural and community FOLD validation;
3. backend final folded state or validated imported simulator state;
4. Three.js render from backend state;
5. deterministic target-match pass;
6. pre/post state artifacts for every generated step;
7. visible state change or explicit unchanged-state reason per step;
8. executor profile feasibility and geometry-linked overlays;
9. local screenshot/pixel QA evidence;
10. hard display decision proving every required gate passed.

Anything weaker must be rejected, blocked, or inspection-only.

## Implementation Slices

### Slice A: Candidate Recipe Contract

Goal: make generated candidate runs reproducible and auditable.

Work:

- Add `candidate-recipe.json` and `candidate-run.json`.
- Record generator version, seed, target id, base form, operation library,
  operation parameters, and selected candidate id.
- Persist rejected candidates with exact blockers.
- Add a gate proving candidate id, downloads, preview, and display decision are
  consistent.

Gate:

```bash
npm run m30:generated-candidate-harness
npm test
npm run validate:stage1
```

Status: Implemented.

### Slice B: Backend State Router

Goal: generated candidates cannot use heuristic preview as folded-state proof.

Work:

- Route generated candidates through Flat-Folder where possible.
- Add a validated imported simulator-state path with provenance and checksums.
- Record `blocked-backend` when no backend state exists.
- Keep Origami Simulator automation blocked unless deterministic export is
  proven locally.

Gate:

```bash
npm run m31:backend-state-router
npm test
npm run validate:stage1
```

Status: Implemented.

### Slice C: Generated Target Scorer

Goal: generated candidates graduate only when the backend-rendered shape
resembles the target.

Work:

- Score generated backend renders against deterministic target fixtures.
- Add a solver-valid wrong-target negative.
- Allow promotion only when target-match passes and the score belongs to the
  selected candidate id.
- Keep boat blocked or rejected unless it passes.

Gate:

```bash
npm run m32:generated-target-scorer
npm test
npm run validate:stage1
```

Status: Implemented.

### Slice D: Generated Step Replay

Goal: generated walkthroughs show real intermediate state transitions.

Work:

- Produce `step-N-pre.fold` and `step-N-post.fold` for every generated step.
- Render selected generated steps through Three.js/WebGL.
- Preserve clicked step number and show only that step's details.
- Treat unchanged steps as explicit unchanged-state records, not motion.

Gate:

```bash
npm run m33:generated-step-replay
npm test
npm run validate:stage1
```

Status: Implemented.

### Slice E: Executor Feasibility Gate

Goal: hand, gripper, cat paw, and dog paw support becomes profile-specific
evidence, not decoration.

Work:

- Evaluate each step against selected executor profile capabilities.
- Bind contact overlays to fold geometry.
- Allow profile-specific failures such as blocked precision pinch.
- Reflect profile feasibility in display decisions and demo labels.

Gate:

```bash
npm run m34:generated-executor-feasibility
npm test
npm run validate:stage1
```

Status: Implemented.

### Slice F: Generated Preview Review

Goal: browser QA catches fake generated success before the user sees it.

Work:

- Add demo cases for known-good success, generated success or generated
  rejection, blocked boat, and profile-specific step overlays.
- Save screenshots under `tmp/qa/`.
- Verify nonblank WebGL, selected-step correctness, frame differences, and
  profile-specific overlay pixel differences.
- Ensure rejected generation and boat cannot visually look like success cards.

Gate:

```bash
npm run m35:generated-preview-review
npm test
npm run validate:stage1
```

Status: Implemented.

### Slice G: Original Feedback Gap Closure Audit

Goal: turn the original user-visible complaints into one explicit acceptance
gate.

Work:

- Verify completed generated output uses WebGL/Three.js from backend folded
  state, not the 2.5D heuristic preview.
- Verify selected-step panels animate solver-backed pre/post states and keep
  the clicked step number and content.
- Verify later steps are pixel-distinct when backend states differ.
- Verify hand/cat executor overlays bind to step geometry and render
  differently.
- Verify decorative dashed helper lines are absent from step SVGs.
- Verify boat remains blocked while solver evidence fails.
- Verify generated success is not conflated with known-good tutorial success
  and no physical-execution claim is made.

Gate:

```bash
npm run m36:original-gap-closure-audit
npm test
npm run validate:stage1
```

Status: Implemented.

## Acceptance Criteria

- At least one generated candidate is evaluated end to end.
- A generated candidate cannot be promoted by label, target name, or operation
  name.
- Any generated success is visibly labeled as generated and backed by every
  required artifact.
- Any generated failure is useful: it records the exact failed gate.
- Boat remains blocked/rejected unless it truly passes every hard gate.
- The demo distinguishes known-good success, generated success, generated
  rejection, and blocked targets.

Status: Accepted for the software evidence gate. The phase does not claim
arbitrary image-to-fold generation or physical execution.

## Proof

- `npm run m30:generated-candidate-harness`
- `npm run m31:backend-state-router`
- `npm run m32:generated-target-scorer`
- `npm run m33:generated-step-replay`
- `npm run m34:generated-executor-feasibility`
- `npm run m35:generated-preview-review`
- `npm run m36:original-gap-closure-audit`
- `npm test`
- `npm run validate:stage1`
- `npm run validate:claims`

## Non-goals

- No arbitrary image-to-fold promise.
- No fake boat completion.
- No physical execution claim.
- No new folding physics engine.
- No Rabbit Ear runtime dependency without an explicit license decision.
