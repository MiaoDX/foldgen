# Final Embodiment Validation Records

Embodiment validation is a final-stage claim gate, not a Stage 1 implementation
blocker.

Stage 1 can be complete when the repo-local technical outputs pass: FOLD
validation, crease SVG generation, pipeline records, preview data, and demo
rendering. A simulator-valid FOLD file, deterministic preview, critic score, or
web demo screenshot is still not enough to claim that a physical executor can
perform the fold.

Create one JSON record per final-stage attempt using `attempt-template.json`.
The executor may be a human hand, robot gripper, tool rig, animal paw, or another
documented morphology. Records belong in `docs/embodiment-validation/attempts/`.

Check the optional final gate with:

```bash
npm run validate:embodiment
```

This command is expected to fail until final-stage physical execution records
exist. Do not use it as the default Stage 1 stop gate.
