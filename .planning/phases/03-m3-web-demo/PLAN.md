# Phase 3 Plan: M3 Web Demo

## Goal

Build a local web demo that renders the five-case M2 pipeline outputs with
curated target selection, image upload entry, clear states, preview output,
folding steps, and downloadable artifacts.

## Tasks

1. Add deterministic preview data to pipeline case outputs.
2. Add a dependency-free local static server for the demo and generated `out/`
   artifacts.
3. Build the demo UI as the first screen, not a landing page.
4. Support curated target selection from `out/m2-pipeline/summary.json`.
5. Support image upload entry by previewing the image and matching known
   curated filenames when possible.
6. Render empty, loading, invalid input, validation failure, partial output,
   success, preview, and download states.
7. Display crease pattern, preview output, folding step, proposal history, and
   critic history for selected cases.
8. Add downloads for FOLD, SVG, validation, proposal, critic, and summary
   artifacts.
9. Add server/demo tests and README/status updates.

## Constraints

- No live model calls, provider adapter, private asset dependency, or public
  deployment.
- The demo must render existing local pipeline outputs before adding uploaded
  target processing.
- Preview data is an inspection aid, not flat-foldability or human
  reproducibility proof.

## Expected Outputs

- `demo/index.html`, `demo/styles.css`, `demo/app.js`, and local server code.
- Pipeline `preview.json` artifacts for each M2 case.
- `npm run demo` command serving the local demo.
- Tests covering server behavior and demo artifact assumptions.

## Verification

Run from the repo root:

- `npm test`
- `npm run validate:fixtures`
- `npm run m1:deterministic`
- `npm run m2:pipeline`
- `npm run demo`

M3 is complete only when the demo can be opened locally and renders the current
M2 outputs without private services or live model calls.

Latest passing checks:

- `npm test`
- `npm run validate:fixtures`
- `npm run m1:deterministic`
- `npm run m2:pipeline`
- `npm run demo`
- Headless Chrome screenshot smoke test for `/demo/?case=simple-bird`
