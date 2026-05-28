# STATUS

Current focus: Stage 1 MVP technical closeout via `intuitive-flow`.

Active source of truth: `docs/plans/stage-1-mvp.md`, derived from
`docs/PLAN.md`.

Stage 1 technical status: M0-M4 plus the Phase 5 executor-readable contract
upgrade are implemented. The current M1/M2 artifacts include executor profiles,
structured action phases, checks, failure modes, and annotations; the demo
renders a selector for human hand, robot gripper, cat paw, and dog paw action
flows. Current valid cases use the label
`simulator-valid / executor-readable / embodiment-untested`.

Latest verification:
- `npm test`
- `npm run validate:fixtures`
- `npm run m1:deterministic`
- `npm run m2:pipeline`
- `npm run validate:claims`
- `npm run demo`
- Headless Chrome screenshot smoke test for `/demo/?case=simple-bird`
- `npm run validate:stage1`

Current stop gate:
- Current technical gate: `npm run validate:stage1`
- Refined contract source: `docs/contracts/stage-1-output-contract.md`

Final-stage claim gate:
- `npm run validate:embodiment` is optional until a launch claim requires
  physical-executor evidence.
- Do not claim a case is embodiment-validated until a final record exists under
  `docs/embodiment-validation/attempts/`.

Next action: no repo-local Stage 1 implementation action remains unless launch
copy needs final physical-executor evidence. No external participation is
required for the repo-local Stage 1 technical gate.
