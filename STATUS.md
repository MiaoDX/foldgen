# STATUS

Current focus: Stage 1 MVP technical continuation via `intuitive-flow`.

Active source of truth: `docs/plans/stage-1-mvp.md`, derived from
`docs/PLAN.md`.

Stage 1 technical status: M0-M3 are implemented, locally verified, and
committed. The old M4 external-participation gate has been re-scoped into
final-stage embodiment validation so it no longer blocks current repo work.

Latest verification:
- `npm test`
- `npm run validate:fixtures`
- `npm run m1:deterministic`
- `npm run m2:pipeline`
- `npm run demo`
- Headless Chrome screenshot smoke test for `/demo/?case=simple-bird`
- `npm run validate:stage1`

Current stop gate:
- `npm run validate:stage1`

Final-stage claim gate:
- `npm run validate:embodiment` is optional until a launch claim requires
  physical-executor evidence.
- Do not claim a case is embodiment-validated until a final record exists under
  `docs/embodiment-validation/attempts/`.

Next action: continue technical iteration from the Stage 1 demo and pipeline.
No external participation is required for the current repo flow.
