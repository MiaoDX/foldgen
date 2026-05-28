# STATUS

Current focus: Stage 1 MVP implementation via `intuitive-flow`.

Active source of truth: `docs/plans/stage-1-mvp.md`, derived from
`docs/PLAN.md`.

Phase 3 status: M3 local web demo is implemented, locally verified, and
committed.

Latest verification:
- `npm test`
- `npm run validate:fixtures`
- `npm run m1:deterministic`
- `npm run m2:pipeline`
- `npm run demo`
- Headless Chrome screenshot smoke test for `/demo/?case=simple-bird`

M4 status: blocked on real human folding attempt records. Do not mark any demo
case human-reproducible until a person records pass/fail and notes.

Next action: collect five human attempt records using
`docs/human-reproducibility/attempt-template.json`.
