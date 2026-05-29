# Generated Usable Origami Graduation Plan

Last checked: 2026-05-29

## Implementation Update

Phase 16 is implemented and locally verified. The default pipeline now includes
one generated graduate:

- `generated-triangle`: `completed-usable-generated`

`generated-triangle` is intentionally separated from the known-good tutorial
fixtures. It has `candidate-recipe.json`, `candidate-run.json`,
backend folded-state evidence, target-match score `1.000`, complete pre/post
step replay, geometry-linked executor overlays for all profiles, and passing
browser QA evidence.

Current completed known-good fixtures remain:

- `known-good-triangle`
- `known-good-corner`
- `known-good-paper-hat`
- `known-good-square-packet`

`simple-boat` remains `blocked-solver`. It is still the canonical regression
case proving that labels and curated cue sequences cannot create a completed
boat claim.

This phase does not prove arbitrary image-to-fold generation. It proves that a
generated candidate can graduate only through the hard artifact chain, and that
generated success is not conflated with known-good tutorial success.

## Goal

Make generated origami candidates genuinely usable, not just better-labeled
schematics. A generated result can become a product demo only if the same
artifact-backed pipeline proves that it folds, resembles the target, has a real
step replay, and is feasible for the selected executor profile.

This plan starts after Phase 15. Phase 15 proved that known-good fixtures can be
displayed honestly. Phase 16 must prove that generation can graduate through the
same gate, or stay rejected with exact evidence.

## Idea Shaping Mode

Auto-guided. The user explicitly asked for a new plan and wants execution to
avoid another fake visual demo. No broad research loop is required before this
phase; use narrow implementation spikes only when they produce local pass/fail
artifacts.

## Source Evidence

- User feedback in this thread - the current product must stop showing
  schematic-only output as if it were a real folding result.
- `docs/plans/production-usable-origami-generation.md` - Phase 15 completed the
  hard display gate, Three.js step replay, known-good fixtures, and local QA
  review.
- `.planning/STATE.md` - current status records four `completed-usable`
  known-good cases, a blocked boat, and blocked Origami Simulator automation.
- `out/m29-local-preview-review/m29-local-preview-review.json` - browser QA
  verifies current selected-step WebGL, pre/post frame differences, selected
  step numbering, and executor-profile visual differences.
- `docs/AGENTS.md` and `docs/WHY.md` - project direction is glue over existing
  origami/simulator tools, not a new physics engine.

## Decisions Already Made

- FOLD remains the canonical artifact format.
- Three.js/WebGL is the completed-output renderer.
- Flat-Folder remains the first flat-folded-state backend where it applies.
- Origami Simulator is not a completed automated backend until deterministic
  state export is proven locally.
- Rabbit Ear must not enter the runtime accidentally because of GPLv3 boundary
  risk.
- Known-good fixture success does not prove arbitrary generation.
- `simple-boat` remains a canonical failure case until a real boat sequence
  passes all gates.
- 2.5D heuristic preview is inspection-only and cannot satisfy completion.
- Physical execution remains unclaimed unless embodiment records exist.

## Idea Shaping Decisions

| # | Question | Classification | Decision | Rationale | Revisit if |
|---|----------|----------------|----------|-----------|------------|
| 1 | Should we do more broad research before implementation? | Assumption | No broad research loop; do narrow backend spikes only. | Current stack is enough to enforce the gate and expose the real blocker. | A needed backend API or license fact cannot be determined locally. |
| 2 | What is the next product milestone? | Mechanical | Generated candidate graduation. | Phase 15 already covers known-good display honesty; the remaining gap is generated candidates. | The user prioritizes a boat-specific manual tutorial instead. |
| 3 | Should boat be forced to pass in this phase? | Taste | Treat boat as the canonical regression test, not the only success target. | Forcing boat can lead back to fake success; a generated case may graduate only if evidence passes. | A sourced boat tutorial/state sequence is available and can pass the gate. |
| 4 | Should Rabbit Ear be added now? | Assumption | No runtime dependency in this phase. | License boundary is unresolved and Phase 16 can proceed with current backends plus isolated import formats. | The project explicitly accepts GPLv3 or isolates it as an external tool. |
| 5 | What counts as “真正可用”? | Mechanical | Backend state, target match, full step replay, executor feasibility, and QA evidence all pass. | This matches the user’s failure reports and Phase 15 hard gate. | Physical-execution claims become launch scope. |

## Product Contract

A generated candidate may be shown as `completed-usable-generated` only when all
of these are true:

1. Candidate recipe is reproducible from committed generator parameters.
2. Source FOLD validates structurally and through community compatibility.
3. Backend final state exists as a FOLD or imported simulator state with
   provenance and checksum.
4. Final Three.js render is generated from backend state, not heuristic preview.
5. Target match passes against a deterministic target fixture.
6. Every tutorial step has pre-state and post-state artifacts.
7. Every step either produces visible geometry change or records an explicit
   unchanged-state reason that the UI shows as unchanged.
8. Executor overlays bind to fold geometry and profile capability checks pass.
9. Local preview QA verifies nonblank WebGL, selected-step replay, frame
   differences, and profile-specific overlay differences.
10. `display-decision.json` is the only source the demo trusts for completion.

Anything weaker is `rejected-solver`, `rejected-target-match`,
`rejected-step-state`, `rejected-executor-feasibility`, `blocked-backend`, or
`inspection-only`.

## Non-Goals

- No arbitrary image-to-fold promise.
- No claim that known-good fixture success means generated success.
- No fake boat completion.
- No physical execution claim.
- No new folding physics engine.
- No Rabbit Ear runtime dependency unless the license decision is explicit.
- No completed display from screenshots, labels, or curated semantic names.

## Smallest Demo

One generated candidate starts from a deterministic candidate recipe, runs
through the backend/target/step/executor gates, and either:

- graduates as `completed-usable-generated` with a Three.js final render and
  selected-step pre/post replay; or
- is rejected with a single exact blocker and cannot render as completed.

The smallest accepted success can be a simple target; it does not need to be
boat. Boat must stay present as a blocked/rejected regression fixture unless it
passes the same gate.

## Fuller Demo

The demo gallery separates:

- `completed-usable` known-good fixtures;
- `completed-usable-generated` generated graduates;
- rejected generated candidates with exact blockers;
- blocked canonical targets such as boat.

For a generated graduate, the user can inspect:

- candidate recipe and selected candidate id;
- final backend state and target-match score;
- selected-step 3D pre/post replay;
- executor profile feasibility and contact overlay;
- artifact downloads.

## Acceptance Criteria

- At least one generated candidate is evaluated end to end by the graduation
  harness.
- A generated candidate cannot be promoted by case label, target name, or
  operation name.
- If no generated candidate passes, the phase still succeeds only as a blocked
  backend/search phase with exact rejected-candidate evidence; it does not add a
  fake completed demo.
- If one candidate passes, it uses a new display mode or explicit generated
  provenance so known-good and generated success are not conflated.
- Boat remains blocked/rejected unless a real boat passes all gates.
- The local demo preview clearly distinguishes known-good success, generated
  success, and rejected generation.

## Verification

Required phase gates:

```bash
npm run m30:generated-candidate-harness
npm run m31:backend-state-router
npm run m32:generated-target-scorer
npm run m33:generated-step-replay
npm run m34:generated-executor-feasibility
npm run m35:generated-preview-review
npm run m36:original-gap-closure-audit
npm test
npm run validate:stage1
npm run validate:claims
```

The `m35` gate must write screenshots and machine-readable review output under
`tmp/qa/` and `out/m35-generated-preview-review/`.

Status: Implemented and verified with:

```bash
npm run m30:generated-candidate-harness
npm run m31:backend-state-router
npm run m32:generated-target-scorer
npm run m33:generated-step-replay
npm run m34:generated-executor-feasibility
npm run m35:generated-preview-review
npm run m36:original-gap-closure-audit
npm run m24:artifact-graph
npm run m25:recognizable-known-good
npm run m26:progressive-state-backend
npm run m27:three-step-walkthrough
npm run m28:candidate-graduation
npm run m29:local-preview-review
npm test
npm run validate:stage1
npm run validate:claims
```

Generated preview QA screenshots include:

- `tmp/qa/foldgen-generated-triangle-graduated.png`
- `tmp/qa/foldgen-generated-triangle-cat-overlay.png`
- `tmp/qa/foldgen-boat-blocked-production.png`

## Vertical Slices

1. Candidate recipe contract

   Define `candidate-recipe.json`, `candidate-run.json`, and rejected-candidate
   records. A run must be reproducible from generator version, seed, base form,
   operation library, operation parameters, and target id.

   Gate:

   ```bash
   npm run m30:generated-candidate-harness
   ```

   Status: Implemented.

2. Backend state router

   Route each generated candidate through Flat-Folder first. Add an imported
   simulator-state path only when the artifact records tool, version, settings,
   source file, checksum, and deterministic frame index. Do not allow heuristic
   preview to satisfy this gate.

   Gate:

   ```bash
   npm run m31:backend-state-router
   ```

   Status: Implemented. `generated-triangle` has passed backend folded-state
   evidence; `simple-boat` remains `blocked-solver`.

3. Target scorer for generated output

   Score the backend-rendered candidate against the target fixture. Add at
   least one solver-valid wrong-target negative and one target-like accepted
   candidate if available.

   Gate:

   ```bash
   npm run m32:generated-target-scorer
   ```

   Status: Implemented. `generated-triangle` passes target-match; the
   wrong-target negative is rejected.

4. Generated step replay

   Produce pre/post state artifacts for every generated step. The selected-step
   WebGL view must animate those states and preserve the clicked step number.
   Unchanged steps are allowed only with explicit unchanged-state metadata and
   UI text.

   Gate:

   ```bash
   npm run m33:generated-step-replay
   ```

   Status: Implemented. `generated-triangle` has solver-backed pre/post state
   replay and selected-step WebGL animation.

5. Executor feasibility gate

   Convert overlays from visual decoration into a pass/fail profile gate for
   each step. Human hand, gripper, cat paw, and dog paw may have different
   outcomes for the same candidate. A profile failure can block that profile
   without invalidating the geometry case.

   Gate:

   ```bash
   npm run m34:generated-executor-feasibility
   ```

   Status: Implemented. Human hand, gripper, cat paw, and dog paw overlays bind
   to fold geometry; paw profiles retain precision-limitation evidence.

6. Demo and QA graduation review

   Add generated-vs-known-good labeling in the demo. QA must verify the generated
   selected case has nonblank WebGL, step frame differences, correct selected
   step details, and profile-specific overlay differences. Rejected generation
   and boat must not look like completed success.

   Gate:

   ```bash
   npm run m35:generated-preview-review
   ```

  Status: Implemented. Browser QA verifies generated WebGL, selected-step
  animation, selected step number, profile-specific overlay differences, and
  blocked boat presentation.

7. Original feedback gap closure audit

   Record one machine-readable audit for the original user-visible gaps: real
   WebGL/Three.js backend rendering, selected-step pre/post animation, clicked
   step preservation, pixel-detected step changes, geometry-linked executor
   overlays, no decorative dashed helper lines, blocked boat, generated-vs-known
   separation, and no physical-execution claim.

   Gate:

   ```bash
   npm run m36:original-gap-closure-audit
   ```

   Status: Implemented. The audit writes
   `out/m36-original-gap-closure-audit/m36-original-gap-closure-audit.json`.

## Risks And Assumptions

- Generated search may not find a passing target in this phase. That is an
  acceptable result only if rejected-candidate evidence is complete and the demo
  does not pretend success.
- Flat-Folder may be too strict or too limited for some multi-step generated
  patterns. The router may need imported simulator-state artifacts, but those
  artifacts still need provenance and checksums.
- Target-match can overfit simple silhouettes. Keep negative fixtures in the
  gate so wrong-but-solver-valid shapes cannot graduate.
- Executor feasibility is still not physical embodiment proof. It is a profile
  artifact gate, not a real-world execution claim.
- Boat may remain blocked. A boat-specific phase should start only when a real
  boat source/tutorial or backend state route is available.

## GSD Handoff Trigger

```text
gsd-plan-phase 16-generated-usable-origami-graduation --prd docs/plans/generated-usable-origami-graduation.md
```
