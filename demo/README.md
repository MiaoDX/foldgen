# foldgen demo

Local Stage 1 demo for rendering pipeline outputs. Current cases are labeled
`simulator-valid / executor-readable / embodiment-untested`.

The demo renders the executor profile and followable action flow from
`diagram-sequence.json`; it does not treat simulator output as final embodiment
evidence.

Run from the repo root:

```bash
npm run m2:pipeline
npm run demo
```

Open `http://localhost:4173/demo/`.

The demo reads `out/m2-pipeline/summary.json` and case artifacts. It does not
call live model providers or claim final embodiment validation.
