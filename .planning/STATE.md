# State

Current focus: Generated usable origami graduation. The product boundary from
Phase 15 remains explicit: `completed-usable` means promotion-allowed
provenance, backend-folded state, deterministic target match, full step-state
walkthrough, Three.js render evidence, executor-overlay artifacts, and a
passing hard display decision. Phase 16 extends that boundary to generated
candidates: generated output may become completed only when reproducible
candidate evidence passes backend state, target match, full step replay,
executor feasibility, and local QA gates. Anything weaker stays rejected,
blocked, partial, or inspection-only.

Source of truth:
- Canonical PRD: `docs/plans/stage-1-mvp.md`
- Roadmap: `.planning/ROADMAP.md`
- Active contract: `docs/contracts/stage-1-output-contract.md`
- Completed phase plans:
  - `.planning/phases/06-multistep-fold-operation-foundation/PLAN.md`
  - `.planning/phases/07-local-search-loop/PLAN.md`
  - `.planning/phases/08-critic-v0/PLAN.md`
  - `.planning/phases/09-image-to-fold-path/PLAN.md`
  - `.planning/phases/10-expanded-public-testbed/PLAN.md`
  - `.planning/phases/11-preview-animation-improvement/PLAN.md`
  - `.planning/phases/12-solver-backed-real-folding-pipeline/PLAN.md`
  - `.planning/phases/13-usable-origami-generation-pipeline/PLAN.md`
  - `.planning/phases/14-real-usable-origami-generation-pipeline/PLAN.md`
  - `.planning/phases/15-production-usable-origami-generation/PLAN.md`
  - `docs/plans/real-usable-origami-generation-pipeline.md`
  - `docs/plans/production-usable-origami-generation.md`
- Active planned phase:
  - `.planning/phases/16-generated-usable-origami-graduation/PLAN.md`
  - `docs/plans/generated-usable-origami-graduation.md`

Status:
- Stage 1 technical gate is complete through Phase 5.
- The next continuation sequence is ordered as Phase 6 multi-step operations,
  Phase 7 local search, Phase 8 critic v0, Phase 9 image-to-fold, Phase 10
  expanded testbed, and Phase 11 preview/animation.
- Phase 6 multi-step operation foundation is implemented and verified.
- Phase 7 local search loop is implemented and verified.
- Phase 8 critic v0 is implemented and verified.
- Phase 9 image-to-fold path is implemented and verified.
- Phase 10 expanded public testbed is implemented and verified.
- Phase 11 preview and animation improvement is implemented and verified.
- User-requested continuation items 1-6 are complete.
- Phase 12 solver-state artifacts are implemented.
- Target-match artifacts now gate completed-target status.
- Phase 13 Three.js/WebGL preview is implemented for solver-backed completed
  cases, with 2D inspection fallback for blocked cases.
- Phase 14 is implemented. Slice A is implemented:
  `display-decision.json` is written per case, the demo trusts it for completed
  display, known-good single-step cases are `completed-usable`, `simple-fish`
  is downgraded to `completed-3d-partial-walkthrough`, and `simple-boat`
  remains `blocked-solver`.
- Phase 14 Slice B is implemented as a blocker/route decision: the Origami
  Simulator spike can generate compatible fold-percent input frames, but it
  cannot yet claim automated solved intermediate states. Origami Simulator is a
  manual fixture/import route until a real browser automation adapter exists.
- Phase 14 Slice C is implemented for the first source/provenance boundary:
  `known-good-triangle` and `known-good-corner` are promotion-allowed
  repo-authored solver-derived fixtures; recognizable generated cue cases,
  including boat, are not promotion-allowed.
- Phase 14 Slice D is implemented as a full step-state validator:
  `completed-usable` cases require complete solver-backed step states and
  selected-step numbering/operation consistency; `simple-fish` remains
  `completed-3d-partial-walkthrough`.
- Phase 14 Slice E is implemented: executor overlays are standalone artifacts
  under `executor-overlays/<profile>/step-N.json`, step visuals reference those
  paths, and display decisions use the overlay artifact summary.
- Phase 14 Slice F is implemented: solver-backed search records rank candidates
  by gate evidence, selected candidate ids match pipeline/display artifacts, and
  blocked cases cannot pass the hard completed gate.
- Phase 15 is implemented and verified. The default pipeline now includes 9
  cases with 4 `completed-usable` known-good cases:
  `known-good-triangle`, `known-good-corner`, `known-good-paper-hat`, and
  `known-good-square-packet`.
- `known-good-paper-hat` and `known-good-square-packet` are the recognizable
  completed fixtures for Phase 15.
- `known-good-square-packet` is the multi-step backend-state proof case.
- Selected-step walkthroughs now animate from backend pre-state FOLD to
  backend post-state FOLD in Three.js/WebGL when those artifacts exist.
- Step WebGL scenes include profile-specific 3D executor contact overlays; the
  local preview gate verifies human-hand and cat-paw overlays produce different
  same-step WebGL pixel hashes.
- `simple-boat` remains `blocked-solver`; it must not appear as a completed boat
  until a real backend-state sequence passes every production gate.
- Origami Simulator automation remains `blocked-automated-state-export`; manual
  or known-good state artifacts with provenance/checksums are the accepted route
  for this phase.
- Phase 16 is implemented and verified. The default pipeline now includes 10
  cases: 4 `completed-usable` known-good cases, 1
  `completed-usable-generated` generated graduate (`generated-triangle`), 1
  `completed-3d-partial-walkthrough` case (`simple-fish`), and blocked
  cases including `simple-boat`.
- `generated-triangle` has candidate recipe/run artifacts, backend folded
  state, target-match, full step replay, executor feasibility overlays, and
  passing browser QA evidence.
- Known-good fixture success and generated success are separated by display
  mode and source provenance. `generated-triangle` is not a known-good tutorial
  source and is not physical embodiment evidence.

Next action:
- Decide whether to start a future boat-specific known-good/state-source phase
  or a broader generated search phase. Do not make boat or any future generated
  candidate a product success case without solver/state, target-match,
  step-replay, executor-feasibility, and QA evidence.
- Keep final embodiment validation optional until a launch claim requires
  physical-executor evidence.

Current Stage 1 gate:
- `npm run validate:stage1`

Current Phase 6 gate:
- `npm run m6:multistep`
- `npm test`
- `npm run validate:stage1`

Current Phase 7 gate:
- `npm run m7:search`
- `npm test`

Current Phase 8 gate:
- `npm run m8:critic`
- `npm test`

Current Phase 9 gate:
- `npm run m9:image-to-fold -- benchmarks/targets/simple-bird.svg`
- `npm test`

Current Phase 10 gate:
- `npm run m10:testbed`
- `npm run validate:fixtures`
- `npm test`

Current Phase 11 gate:
- `npm run m11:preview`
- `npm test`
- `npm run validate:stage1`

Current Phase 12 gate:
- `npm run m12:solver-state`
- `npm test`
- `npm run validate:stage1`

Current Phase 13 gate:
- `npm run m13:display-modes`
- `npm run m13:three-preview`
- `npm test`
- `npm run validate:stage1`

Current usable-pipeline gates:
- Slice A display hardening: `npm run m13:display-modes`,
  `npm run m13:three-preview`, `npm test`,
  `npm run validate:stage1`
- Slice B known-good targets: `npm run m14:known-good-targets`, `npm test`,
  `npm run validate:stage1`
- Slice C step-state walkthrough: `npm run m15:step-state-walkthrough`,
  `npm test`, `npm run validate:stage1`
- Slice D executor overlays: `npm run m16:executor-overlays`, `npm test`,
  `npm run validate:stage1`
- Slice E solver-search: `npm run m17:solver-search`, `npm test`,
  `npm run validate:stage1`

Current real-usable-pipeline gates:
- Slice A hard display decision: implemented and verified with
  `npm run m18:display-decision`, `npm run m13:display-modes`,
  `npm run m14:known-good-targets`, `npm run m15:step-state-walkthrough`,
  `npm run m13:three-preview`, `npm test`, and `npm run validate:stage1`
- Slice B Origami Simulator adapter spike:
  implemented with `npm run m19:origami-simulator-spike`; result is
  `blocked-automated-state-export`, so the next route is tutorial/state
  fixtures or a future browser automation adapter
- Slice C known-good tutorials: `npm run m20:known-good-tutorials`,
  implemented with `npm run m20:known-good-tutorials`; first provenance gate
  passes with two simple solver-derived fixtures and no recognizable promoted
  cue cases
- Slice D full step states: `npm run m21:full-step-states`, `npm test`,
  implemented with `npm run m21:full-step-states`; completed-usable cases have
  complete solver-backed step states and partial cases stay downgraded
- Slice E executor overlay artifacts:
  implemented with `npm run m22:executor-overlay-artifacts`; standalone overlay
  artifacts are geometry-linked for every profile and step
- Slice F solver-backed search: `npm run m23:solver-backed-search`,
  implemented with `npm run m23:solver-backed-search`; selected candidate ids
  and display modes are consistent with display-decision artifacts

Current production-usable gates:
- Slice A artifact graph lock: implemented with `npm run m24:artifact-graph`;
  completed-usable cases require final state, target match, full step states,
  executor overlays, and hard display-decision evidence.
- Slice B recognizable known-good tutorial: implemented with
  `npm run m25:recognizable-known-good`; `known-good-paper-hat` and
  `known-good-square-packet` are recognizable completed fixtures, while
  `simple-boat` remains `blocked-solver`.
- Slice C progressive state backend route: implemented with
  `npm run m26:progressive-state-backend`; `known-good-square-packet` validates
  multi-step backend-backed state import, and Origami Simulator automation
  remains blocked.
- Slice D 3D step walkthrough: implemented with
  `npm run m27:three-step-walkthrough`; selected-step rendering uses backend
  pre/post state artifacts, animates between the states in Three.js/WebGL, and
  preserves the selected step number.
- Slice E candidate graduation: implemented with
  `npm run m28:candidate-graduation`; solver-valid wrong-target candidates are
  blocked by target-match.
- Slice F local preview review: implemented with
  `npm run m29:local-preview-review`; screenshots are written under `tmp/qa/`,
  selected-step WebGL pre/post frames are pixel-checked, and same-step
  human-hand vs cat-paw overlay renders are compared by pixel hash.

Current generated-usable graduation gates:
- Slice A candidate recipe contract:
  implemented with `npm run m30:generated-candidate-harness`
- Slice B backend state router:
  implemented with `npm run m31:backend-state-router`
- Slice C generated target scorer:
  implemented with `npm run m32:generated-target-scorer`
- Slice D generated step replay:
  implemented with `npm run m33:generated-step-replay`
- Slice E executor feasibility gate:
  implemented with `npm run m34:generated-executor-feasibility`
- Slice F generated preview review:
  implemented with `npm run m35:generated-preview-review`
- Slice G original feedback gap closure audit:
  implemented with `npm run m36:original-gap-closure-audit`; it records
  machine-readable evidence for the original user-visible gaps: real WebGL from
  backend state, selected-step pre/post animation, preserved clicked step
  numbers, pixel-detected frame changes, geometry-linked executor overlays,
  no decorative dashed helper lines, blocked boat, generated-vs-known-good
  separation, and no physical-execution claim.

Completion gate for 1-6 continuation:
- `npm run m6:multistep`
- `npm run m7:search`
- `npm run m8:critic`
- `npm run m9:image-to-fold -- benchmarks/targets/simple-bird.svg`
- `npm run m10:testbed`
- `npm run m11:preview`
- `npm run m36:original-gap-closure-audit`
- `npm run validate:stage1`

Phase 1 verification:
- `npm test`
- `npm run validate:fixtures`
- `npm run m1:deterministic`

Phase 2 verification:
- `npm test`
- `npm run validate:fixtures`
- `npm run m1:deterministic`
- `npm run m2:pipeline`

Phase 3 verification:
- `npm test`
- `npm run validate:fixtures`
- `npm run m1:deterministic`
- `npm run m2:pipeline`
- `npm run demo`
- Headless Chrome screenshot smoke test for `/demo/?case=simple-bird`

Phase 4 verification:
- `npm test`
- `npm run validate:stage1`
- `npm run validate:claims`

Known constraints:
- Do not depend on private repos or paid model APIs.
- Do not make physical-execution claims without final embodiment records.
- Commit only owned files after focused verification.
