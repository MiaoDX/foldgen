# foldgen demo

Local Stage 1 demo for rendering pipeline outputs. Current cases are labeled
`simulator-valid / executor-readable / embodiment-untested`.

The demo renders a selector for `human-hand`, `two-finger-gripper`,
`cat-paw-profile`, and `dog-paw-profile`, then shows the selected followable
action flow. Each selected step shows a generated SVG instruction diagram, a
paper-face preview frame, and the selected `$imagegen` executor illustration.
It does not treat simulator output or executor illustrations as final
embodiment evidence. It also separates local preview, community FOLD
compatibility, Flat-Folder solver output, and template executor instructions so
a failed external adapter does not silently look like a successful physical
claim.

Run from the repo root:

```bash
npm run m2:pipeline
npm run demo
```

Open `http://localhost:4173/demo/`.

Direct preview links accept `case` and `profile`, for example:
`http://localhost:4173/demo/?case=simple-flower&profile=cat-paw-profile`.

The demo reads `out/m2-pipeline/summary.json` and case artifacts. It does not
call live model providers or claim final embodiment validation.
