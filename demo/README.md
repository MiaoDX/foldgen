# foldgen demo

Local Stage 1 demo for rendering pipeline outputs. Current cases are labeled
`simulator-valid / embodiment-untested`.

The refined Stage 1 contract requires a followable executor-readable action
flow. The current demo still shows the coarse one-sentence step output and is
scheduled for the Phase 5 executor-readable upgrade.

Run from the repo root:

```bash
npm run m2:pipeline
npm run demo
```

Open `http://localhost:4173/demo/`.

The demo reads `out/m2-pipeline/summary.json` and case artifacts. It does not
call live model providers or claim final embodiment validation.
