# STATUS

Current focus: Stage 1 MVP implementation via `intuitive-flow`.

Active source of truth: `docs/plans/stage-1-mvp.md`, derived from
`docs/PLAN.md`.

Phase 3 status: M3 local web demo is implemented and locally verified against
the five-case pipeline output.

Latest verification:
- `npm test`
- `npm run validate:fixtures`
- `npm run m1:deterministic`
- `npm run m2:pipeline`
- `npm run demo`
- Headless Chrome screenshot smoke test for `/demo/?case=simple-bird`

Next action: commit the verified Phase 3 slice, then continue to M4 human gate
and launch-material claim discipline from that clean boundary.
