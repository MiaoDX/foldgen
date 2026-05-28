# fold-core

Shared geometry / simulation / rendering glue for origami projects in the MiaoDX ecosystem.

**Owned here** (foldgen — public). Consumed by:
- `foldgen` (this repo) — the agent loop renders/validates candidate FOLDs through fold-core
- `MiaoDX/microsites → sites/origami` (private) — the tutorial site's render/stylize pipeline

> Lives in the **public** repo on purpose: fold-core is open infrastructure, and a public consumer (foldgen) cannot depend on a dependency hidden inside a private repo.

## Scope (deliberately minimal — target < 500 LoC of glue)

fold-core is **not** a new origami simulator. It is a thin layer over existing, battle-tested tools:

- **FOLD format** (`edemaine/fold`) — parse / serialize / validate the community-standard JSON
- **Origami Simulator** (Ghassaei/Demaine/Gershenfeld, MIT) and/or **Rabbit Ear** (Robby Kraft) — folding simulation
- **puppeteer + three.js** — headless rendering to multi-angle PNG / depth / canny

## Implemented M0/M1 API

```javascript
// FOLD I/O
parseFold(content: string): FoldFile
serializeFold(fold: FoldFile): string
validateFold(fold: FoldFile): ValidationResult

// M1 deterministic output
createCreasePatternSvg(fold: FoldFile): string
applyLocalFoldOperation(fold: FoldFile, op?: LocalFoldOperation): FoldFile
createDiagramStep(op: LocalFoldOperation, index?: number): DiagramStep
```

The current validation is structural: JSON parseability, vertex/edge/face shape,
index bounds, and assignment checks. It does not claim full physical
flat-foldability.

## Intended Later API

```typescript
// Folding simulation (delegates to Origami Simulator or Rabbit Ear)
foldToState(fold: FoldFile, ratio: number): FoldedState
sampleSteps(fold: FoldFile, steps: number): FoldedState[]

// Rendering (puppeteer + three.js headless)
renderViews(state: FoldedState, opts: RenderOpts): {
  rgb: Buffer[], depth: Buffer[], canny: Buffer[]
}
```

(Style transfer / imagegen calls do NOT live here — that's the origami site's `pipeline/stylize.ts`. fold-core stays deterministic.)

## Design principles

1. **Minimal** — glue, not a framework. YAGNI; don't over-abstract before there's a real second consumer need.
2. **Deterministic** — no AI calls. Same FOLD in, same geometry/frames out.
3. **One owner** — foldgen owns the API; the origami site consumes it, doesn't fork.

## Status

M0/M1 deterministic spine exists. Run from the repo root:

```bash
npm test
npm run validate:fixtures
npm run m1:deterministic
```
