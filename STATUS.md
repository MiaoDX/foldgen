# STATUS

Current focus: post-Stage-1 continuation via `intuitive-flow` is complete
through Phase 16, including generated-usable graduation and the original
user-feedback gap-closure audit.

Active source of truth: `docs/plans/stage-1-mvp.md`, derived from
`docs/PLAN.md`.

Stage 1 technical status: M0-M4 plus the Phase 5 executor-readable contract
upgrade are implemented. The current M1/M2 artifacts include executor profiles,
structured action phases, checks, failure modes, and annotations; the demo
renders a selector for human hand, robot gripper, cat paw, and dog paw action
flows. Completed software demos remain
`simulator-valid / executor-readable / embodiment-untested`; blocked and partial
targets stay explicitly labeled and cannot render as completed.

Phase 6 status: implemented and verified. `fold-core` can apply ordered
operation sequences, `npm run m6:multistep` writes multi-step artifacts for all
four executor profiles, and the five curated pipeline cases now select two-step
operation sequences.

Phase 7 status: implemented and verified. `npm run m7:search` writes five local
search cases with iteration history, proposal validation, preview summaries,
scores, selected operations, and executor-readable multi-step sequences for all
four executor profiles.

Phase 8 status: implemented and verified. `npm run m8:critic` writes ranked
critic histories with verdicts, score components, feature matches, invalid
candidate rejections, and explanation reasons.

Phase 9 status: implemented and verified. `npm run m9:image-to-fold --
benchmarks/targets/simple-bird.svg` analyzes a local SVG reference, selects a
profile/base form with reasons, runs local search, and writes fold/preview/
diagram artifacts for all four executor profiles.

Phase 10 status: implemented and verified. The public target set now has ten
SVG fixtures, including five creative/reference cases, and `npm run
m10:testbed` runs image-to-fold across all ten.

Phase 11 status: implemented and verified. `npm run m11:preview` writes
multi-frame preview animation, pipeline/search/image-to-fold artifacts expose
`preview_animation`, and the demo renders animation frames when available while
keeping the static preview fallback.

Phase 12-16 status: implemented and verified. The current production pipeline
uses backend folded-state artifacts and Three.js/WebGL for completed results,
keeps the 2.5D preview inspection-only, promotes known-good/tutorial-backed
cases only through the artifact graph, and allows generated candidates to
graduate only when recipe, backend state, target match, step replay, executor
feasibility, browser QA, and display-decision gates all pass.

Current generated graduate:
- `generated-triangle`: `completed-usable-generated`

Current protected blocker:
- `simple-boat`: `blocked-solver`; it is intentionally not shown as completed
  while Flat-Folder/backend state evidence fails.

Continuation order:
1. Multi-step fold operation foundation.
2. Local search loop.
3. Critic v0.
4. Image-to-fold path.
5. Expanded testbed.
6. Preview and animation improvement.
7. Solver-backed real folding pipeline.
8. Usable origami generation pipeline.
9. Real usable origami generation pipeline.
10. Production usable origami generation.
11. Generated usable origami graduation.

Latest verification:
- `npm run m6:multistep`
- `npm run m7:search`
- `npm run m8:critic`
- `npm run m9:image-to-fold -- benchmarks/targets/simple-bird.svg`
- `npm run m10:testbed`
- `npm run m11:preview`
- `npm run m24:artifact-graph`
- `npm run m25:recognizable-known-good`
- `npm run m26:progressive-state-backend`
- `npm run m27:three-step-walkthrough`
- `npm run m28:candidate-graduation`
- `npm run m29:local-preview-review`
- `npm run m30:generated-candidate-harness`
- `npm run m31:backend-state-router`
- `npm run m32:generated-target-scorer`
- `npm run m33:generated-step-replay`
- `npm run m34:generated-executor-feasibility`
- `npm run m35:generated-preview-review`
- `npm run m36:original-gap-closure-audit`
- `npm test`
- `npm run validate:fixtures`
- `npm run m1:deterministic`
- `npm run m2:pipeline`
- `npm run validate:claims`
- `npm run demo`
- Headless Chrome screenshot smoke test for `/demo/?case=simple-bird`
- `npm run validate:stage1`

Current stop gate:
- Stage 1 technical gate: `npm run validate:stage1`
- Phase 6 gate passed: `npm run m6:multistep`, `npm test`, and
  `npm run validate:stage1`
- Phase 7 gate passed: `npm run m7:search`, `npm test`, and
  `npm run validate:stage1`
- Phase 8 gate passed: `npm run m8:critic`, `npm test`, and
  `npm run validate:stage1`
- Phase 9 gate passed:
  `npm run m9:image-to-fold -- benchmarks/targets/simple-bird.svg`,
  `npm test`, and `npm run validate:stage1`
- Phase 10 gate passed: `npm run m10:testbed`, `npm run validate:fixtures`,
  `npm test`, and `npm run validate:stage1`
- Phase 11 gate passed: `npm run m11:preview`, `npm test`, and
  `npm run validate:stage1`
- Phase 16 user-visible gap closure gate passed:
  `npm run m36:original-gap-closure-audit`
- Refined contract source: `docs/contracts/stage-1-output-contract.md`

Final-stage claim gate:
- `npm run validate:embodiment` is optional until a launch claim requires
  physical-executor evidence.
- Do not claim a case is embodiment-validated until a final record exists under
  `docs/embodiment-validation/attempts/`.

Next action: the software evidence gate for the requested usable-origami
graduation path is in place. Remaining product expansion is target-specific:
for example, a real boat demo requires a sourced or generated boat sequence
that passes the same solver/backend/target/step/executor/browser gates. Final
embodiment validation remains optional until a launch claim requires it.
