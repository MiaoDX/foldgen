# State

Current focus: Phase 4 - M4 Human Gate And Launch Materials.

Source of truth:
- Canonical PRD: `docs/plans/stage-1-mvp.md`
- Roadmap: `.planning/ROADMAP.md`
- Active phase plan: `.planning/phases/04-m4-human-gate-and-launch-materials/PLAN.md`

Status:
- GSD ingest/plan handoff is degraded inline, not a full spawned-subagent run.
- Phase 1 implementation is complete, locally verified, and committed.
- Phase 2 implementation is complete, locally verified, and committed.
- Phase 3 implementation is complete, locally verified, and committed.
- Phase 4 is blocked on real human folding attempt records.

Next action:
- Collect five human attempt records with pass/fail and notes. Do not mark demo
  cases human-reproducible from simulator, critic, or preview output alone.
- Run `npm run validate:human` after records are added; the command should fail
  until at least five passing claim-allowed records exist.

Current M4 gate result:
- `npm run validate:human` fails with 0 passing claim-allowed records.

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
