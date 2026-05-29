# foldgen demo

Local Stage 1 demo for rendering pipeline outputs. Current cases are labeled
`simulator-valid / executor-readable / embodiment-untested`.

The demo renders a selector for `human-hand`, `two-finger-gripper`,
`cat-paw-profile`, and `dog-paw-profile`, then shows the selected followable
action flow. Completed or solver-backed selected steps render a Three.js/WebGL
pre-state to post-state animation from FOLD artifacts, with profile-specific 3D
contact overlays for the selected executor. Steps without backend state fall
back to inspection-only canvas output. The selected `$imagegen` executor
illustration is supporting context only.

The demo does not treat simulator output or executor illustrations as final
embodiment evidence. It also separates local preview, community FOLD
compatibility, Flat-Folder solver output, profile visual instructions, and the
hard display decision so a failed external adapter does not silently look like a
successful physical claim.

Run from the repo root:

```bash
npm run m2:pipeline
npm run demo
```

Open `http://localhost:4173/demo/`.

Direct preview links accept `case` and `profile`, for example:
`http://localhost:4173/demo/?case=simple-flower&profile=cat-paw-profile`.
They also accept `step`, for example
`http://localhost:4173/demo/?case=known-good-square-packet&profile=cat-paw-profile&step=2`.

The demo reads `out/m2-pipeline/summary.json` and case artifacts. It does not
call live model providers or claim final embodiment validation.
