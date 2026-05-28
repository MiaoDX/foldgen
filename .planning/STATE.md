# State

Current focus: Phase 4 - M4 Technical Closeout And Claim Guard.

Source of truth:
- Canonical PRD: `docs/plans/stage-1-mvp.md`
- Roadmap: `.planning/ROADMAP.md`
- Active phase plan: `.planning/phases/04-m4-technical-closeout-claim-guard/PLAN.md`

Status:
- GSD ingest/plan handoff is degraded inline, not a full spawned-subagent run.
- Phase 1 implementation is complete, locally verified, and committed.
- Phase 2 implementation is complete, locally verified, and committed.
- Phase 3 implementation is complete, locally verified, and committed.
- Phase 4 has been re-scoped so it is not blocked on external executor records.

Next action:
- Continue Stage 1 technical iteration and closeout using `npm run validate:stage1`.
- Keep final embodiment validation optional until a launch claim requires
  physical-executor evidence.

Current Stage 1 gate:
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

Known constraints:
- Do not depend on private repos or paid model APIs.
- Do not make physical-execution claims without final embodiment records.
- Commit only owned files after focused verification.
