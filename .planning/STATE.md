# State

Current focus: Phase 3 - M3 Web Demo.

Source of truth:
- Canonical PRD: `docs/plans/stage-1-mvp.md`
- Roadmap: `.planning/ROADMAP.md`
- Active phase plan: `.planning/phases/03-m3-web-demo/PLAN.md`

Status:
- GSD ingest/plan handoff is degraded inline, not a full spawned-subagent run.
- Phase 1 implementation is complete, locally verified, and committed.
- Phase 2 implementation is complete, locally verified, and committed.
- Phase 3 implementation is complete and locally verified.

Next action:
- Commit the verified Phase 3 slice, then continue to M4 human gate and
  launch-material claim discipline from a clean committed boundary.

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
- Do not implement agent loop, web demo, live providers, or launch materials in
  Phase 1.
- Commit only owned files after focused verification.
