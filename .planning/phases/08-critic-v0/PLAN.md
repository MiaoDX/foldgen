# Phase 8: Critic v0

## Goal

Make candidate scoring an explicit, inspectable critic artifact instead of an
inline search detail. The critic must reject invalid candidates, rank valid
candidates deterministically, and explain its score components.

## Scope

- Add a `foldgen-agent` critic module.
- Refactor local search to store `critic_result` for every proposal.
- Add a local CLI gate: `npm run m8:critic`.
- Write per-case critic histories with verdicts, scores, score components, and
  human-readable reasons.

## Non-goals

- No CLIP, MLLM, or paid API call.
- No image feature extraction; Phase 9 owns reference-image routing.
- No physical execution claim.

## Gate

```bash
npm run m8:critic
npm test
```

## Completion Evidence

- `out/m8-critic/summary.json` has five critic-evaluated cases.
- Every case has a selected valid candidate.
- Invalid proposals are rejected with reasons.
- Tests prove score ordering and reason output.

## Status

Completed on 2026-05-28.

Proof:
- `npm run m8:critic`
- `npm test`
- `npm run validate:stage1`
