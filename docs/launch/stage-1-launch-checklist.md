# Stage 1 Launch Checklist

Draft-only launch guard for Stage 1. Do not publish launch copy from this file
until the current technical gate and any intended final claim gate pass.

## Current Gate

```bash
npm run validate:stage1
```

This is the Stage 1 technical gate. It validates tests, fixtures, deterministic
M1 output, five-case M2 pipeline output, and M4 claim labels.

## Case Label

Current Stage 1 case label:
`simulator-valid / executor-readable / embodiment-untested`.

Use this label for README, demo, blog draft, screenshots, and pipeline summaries
only while `npm run validate:stage1` passes. It is still not a physical-executor
claim.

## Final Claim Gate

```bash
npm run validate:embodiment
```

Run this only when launch copy intends to make final physical-executor claims.
It is expected to fail until attempt records exist under
`docs/embodiment-validation/attempts/`.

## Before Public Copy

- Run `npm run validate:stage1`.
- Recheck related-work status for Learn2Fold and OrigamiBench. Current M4 check:
  `docs/launch/related-work-check-2026-05-28.md`.
- Keep any blog or announcement language draft-only until final claims are
  matched to evidence.
- Do not describe simulator output, preview output, critic scores, or screenshots
  as final executor evidence.
