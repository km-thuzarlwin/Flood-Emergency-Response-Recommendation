# FERRS — screen designs

Static mockups for the Claude Design canvas. Each `*.dc.html` is one artboard;
`canvas.json` lays them out.

| File | Screen |
|---|---|
| `Main.dc.html` | Report form (the finalized v2 design — 10 questions, azure palette, outlined selected state) |
| `Results.dc.html` | Recommendation screen |
| `Overview.dc.html` | Regional overview |

## Regenerate / republish the canvas

```bash
# from this directory, with the design skill's helper:
node "<skill>/seed-canvas.mjs" --template "<skill>/payload.template.html" \
  --out ferrs-screen-sketches.html --title "FERRS Screen Sketches" \
  --artboard Main.dc.html --artboard Results.dc.html --artboard Overview.dc.html \
  --canvas canvas.json
```
`ferrs-screen-sketches.html` (the ~2 MB seeded output) and `from-canvas/` (extracted
copies of edits made in the hosted canvas) are git-ignored.

The Report form here is implemented in `web/src/components/FloodReportForm.tsx` +
`web/src/components/reportControls.tsx`; the answer→reasoner mapping is
`web/src/lib/reportInput.ts`. Design decisions are logged in
`../Handoffs/10-Decision-Log.md` (2026-08-30 entries).
