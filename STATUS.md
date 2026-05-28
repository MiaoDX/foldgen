# STATUS

Current focus: Stage 1 MVP technical continuation via `intuitive-flow`.

Active source of truth: `docs/plans/stage-1-mvp.md`, derived from
`docs/PLAN.md`.

Stage 1 technical status: M0-M4 have a working coarse technical spine, but the
executor-readable contract was sharpened after demo review. The current demo
still renders one-sentence steps, so M1-M4 need a follow-up implementation pass
before Stage 1 can honestly claim executor-readable output.

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
- Current coarse gate: `npm run validate:stage1`
- Refined contract source: `docs/contracts/stage-1-output-contract.md`

Final-stage claim gate:
- `npm run validate:embodiment` is optional until a launch claim requires
  physical-executor evidence.
- Do not claim a case is embodiment-validated until a final record exists under
  `docs/embodiment-validation/attempts/`.

Next action: implement Phase 5 executor-readable contract upgrade. No external
participation is required for this repo-local upgrade unless launch copy makes a
final physical-executor claim.
