# STATUS

Current focus: post-Stage-1 continuation via `intuitive-flow`, moving from
completed Phase 7 local search into Phase 8 critic v0.

Active source of truth: `docs/plans/stage-1-mvp.md`, derived from
`docs/PLAN.md`.

Stage 1 technical status: M0-M4 plus the Phase 5 executor-readable contract
upgrade are implemented. The current M1/M2 artifacts include executor profiles,
structured action phases, checks, failure modes, and annotations; the demo
renders a selector for human hand, robot gripper, cat paw, and dog paw action
flows. Current valid cases use the label
`simulator-valid / executor-readable / embodiment-untested`.

Phase 6 status: implemented and verified. `fold-core` can apply ordered
operation sequences, `npm run m6:multistep` writes multi-step artifacts for all
four executor profiles, and the five curated pipeline cases now select two-step
operation sequences.

Phase 7 status: implemented and verified. `npm run m7:search` writes five local
search cases with iteration history, proposal validation, preview summaries,
scores, selected operations, and executor-readable multi-step sequences for all
four executor profiles.

Continuation order:
1. Multi-step fold operation foundation.
2. Local search loop.
3. Critic v0.
4. Image-to-fold path.
5. Expanded testbed.
6. Preview and animation improvement.

Latest verification:
- `npm run m6:multistep`
- `npm run m7:search`
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
- Active Phase 8 gate: `npm run m8:critic` and `npm test`
- Refined contract source: `docs/contracts/stage-1-output-contract.md`

Final-stage claim gate:
- `npm run validate:embodiment` is optional until a launch claim requires
  physical-executor evidence.
- Do not claim a case is embodiment-validated until a final record exists under
  `docs/embodiment-validation/attempts/`.

Next action: implement Phase 8 critic v0. No external participation is required
for the repo-local continuation gates.
