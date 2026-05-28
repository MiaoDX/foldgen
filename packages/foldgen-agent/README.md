# foldgen-agent

Deterministic Stage 1 pipeline glue for foldgen.

This package owns agent-facing orchestration and case records. It does not make
live provider calls in M2; the current pipeline uses curated target profiles and
`fold-core` primitives to produce inspectable local artifacts.

Run from the repo root:

```bash
npm run m2:pipeline
```

The command writes `out/m2-pipeline/summary.json` plus one directory per curated
target. Each case records:

- selected base form
- candidate local fold operations
- validation status
- proposal history
- critic history
- derived FOLD, crease SVG, preview JSON, validation JSON, and diagram-step JSON

The deterministic critic scores are inspection metadata only. They are not human
reproducibility evidence.

M4 human-gate records are validated with:

```bash
npm run validate:human
```

That command fails until five passing human attempts are recorded with
`claim_allowed: true`.
