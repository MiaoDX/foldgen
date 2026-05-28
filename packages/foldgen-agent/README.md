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
- derived FOLD, crease SVG, validation JSON, and diagram-step JSON

The deterministic critic scores are inspection metadata only. They are not human
reproducibility evidence.
