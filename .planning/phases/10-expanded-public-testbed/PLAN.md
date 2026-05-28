# Phase 10: Expanded Public Testbed

## Goal

Expand the public target fixture set beyond the original five curated cases and
add a local command that exercises image-to-fold across the expanded references.

## Scope

- Add five public reference SVG fixtures, bringing target metadata to ten cases.
- Mark new cases with profile hints so they can route through existing base-form
  profiles while remaining distinct public references.
- Add `npm run m10:testbed` to run image-to-fold across the expanded target set.

## Non-goals

- No new base forms.
- No paid image or model provider.
- No physical execution claim.

## Gate

```bash
npm run m10:testbed
npm run validate:fixtures
npm test
```

## Completion Evidence

- `benchmarks/targets/metadata.json` lists ten public targets.
- `out/m10-testbed/summary.json` records ten image-to-fold runs.
- At least five cases are marked as creative/reference cases in metadata.
- Tests prove expanded metadata and batch image-to-fold routing.

## Status

Completed on 2026-05-28.

Proof:
- `npm run m10:testbed`
- `npm run validate:fixtures`
- `npm test`
- `npm run validate:stage1`
