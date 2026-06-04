# Thesis figures

All figures are kept as **committed sources** and exported to print-resolution
**PNG** plus **SVG**. Regenerate everything with:

```bash
npm run diagrams
```

This runs `prisma generate` (which emits the ERD as Mermaid markdown) and then
`scripts/render-diagrams.mjs`, which renders every source with one shared theme.

## Consistency & print rules

- **One theme** (`neutral`, white background) across all figures, rendered at
  **scale 3 (≈ 300 DPI)** — suitable for print.
- **Greyscale-legible**: relationships are carried by layout, labelled edges, and
  border weight — never by colour alone — so figures survive black-and-white
  printing.
- **No burned-in captions/titles.** Figure numbers and captions live in the
  thesis text. The diagrams contain only their own content.
- Both **PNG** (for embedding) and **SVG** (vector, for zoom / high-quality
  print) are committed for every figure.

## Figures

| File (source → output) | Figure | Chapter | Type |
|---|---|---|---|
| `fig2-threat-ecosystem.mmd` | 2 — Phishing threat ecosystem | 1 | Conceptual |
| `fig3-market-gap.mmd` | 3 — The market gap (Phlare's position) | 1 | Conceptual |
| `fig4-system-architecture.mmd` | 4 — System concept / architecture | impl. | System |
| `fig5-phishing-evolution.mmd` | 5 — Evolution of phishing (1995–2025) | 1 | Conceptual timeline |
| `fig6-attack-taxonomy.mmd` | 6 — Taxonomy of phishing attacks | 1 | Conceptual |
| `fig7-cialdini-principles.mmd` | 7 — Cialdini's principles in phishing | 1 (§1.3) | Conceptual mapping |
| `erd.md` (generated from `schema.prisma`) | ERD | data model | Auto-generated |

> Figure 4 reflects the **actual** Phase 1 architecture and is regenerated as the
> system evolves. The ERD is generated from the Prisma schema, so it always
> matches the real data model.

## Editing a figure

1. Edit the `.mmd` source (Mermaid). Keep the shared `%%{init ...}%%` theme block
   at the top so it matches the others.
2. Run `npm run diagrams`.
3. Commit the source **and** the regenerated `.png` + `.svg`.
