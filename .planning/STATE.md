# State

Current focus: Phase 9 - Image-to-fold Path.

Source of truth:
- Canonical PRD: `docs/plans/stage-1-mvp.md`
- Roadmap: `.planning/ROADMAP.md`
- Active contract: `docs/contracts/stage-1-output-contract.md`
- Completed phase plans:
  - `.planning/phases/06-multistep-fold-operation-foundation/PLAN.md`
  - `.planning/phases/07-local-search-loop/PLAN.md`
  - `.planning/phases/08-critic-v0/PLAN.md`

Status:
- Stage 1 technical gate is complete through Phase 5.
- The next continuation sequence is ordered as Phase 6 multi-step operations,
  Phase 7 local search, Phase 8 critic v0, Phase 9 image-to-fold, Phase 10
  expanded testbed, and Phase 11 preview/animation.
- Phase 6 multi-step operation foundation is implemented and verified.
- Phase 7 local search loop is implemented and verified.
- Phase 8 critic v0 is implemented and verified.
- Phase 9 image-to-fold path is the next implementation slice.

Next action:
- Create the Phase 9 plan, then route a local reference image/SVG through
  feature analysis, base-form selection, local search, critic records, and
  executor-readable diagram output.

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
