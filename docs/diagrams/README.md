# Thesis figures

Figures come in two kinds:

- **Mermaid-generated** (fig2, fig3, fig4, and the ERD): committed `.mmd`/schema
  source rendered to PNG + SVG by `npm run diagrams`.
- **Hand-authored** (fig1, fig5, fig6, fig7, fig8): committed PNGs. These
  conceptual figures are drawn by hand because the manual layout reads more
  cleanly in print than the auto-generated equivalent.

Regenerate the Mermaid set with:

```bash
npm run diagrams
```

This runs `prisma generate` (which emits the ERD as Mermaid markdown) and then
`scripts/render-diagrams.mjs`. It does **not** touch the hand-authored PNGs.

## Consistency & print rules

- Shared, greyscale-legible house style across every figure: relationships are
  carried by layout, labels, and border weight — never by colour alone — so they
  survive black-and-white printing.
- Mermaid figures use the `neutral` theme on a white background, rendered at
  **scale 3 (≈ 300 DPI)**. Hand-authored figures are exported at comparable
  print resolution (≥ 2000 px wide).
- **No burned-in captions/titles.** Figure numbers and captions live in the
  thesis text; the images contain only their own content.

## Figures

| Output | Figure | Chapter | Source |
|---|---|---|---|
| `fig1-phishing-volume.png` | 1 — Phishing attack volume by quarter | 1 | Hand-authored |
| `fig2-threat-ecosystem.png/.svg` | 2 — Phishing threat ecosystem | 1 | `fig2-threat-ecosystem.mmd` |
| `fig3-market-gap.png/.svg` | 3 — The market gap (Phlare's position) | 1 | `fig3-market-gap.mmd` |
| `fig4-system-architecture.png/.svg` | 4 — System concept / architecture | impl. | `fig4-system-architecture.mmd` |
| `fig5-phishing-evolution.png` | 5 — Evolution of phishing (1995–2025) | 1 | Hand-authored |
| `fig6-attack-taxonomy.png` | 6 — Taxonomy of phishing attacks | 1 | Hand-authored |
| `fig7-cialdini-principles.png` | 7 — Cialdini's principles in phishing | 1 (§1.3) | Hand-authored |
| `fig8-dsrm-methodology.png` | 8 — DSRM activities mapped to chapters | method. | Hand-authored |
| `erd.png/.svg` | ERD | data model | `schema.prisma` (generated) |

> Figure 4 reflects the **actual** implemented architecture and is regenerated as
> the system evolves. The ERD is generated from the Prisma schema, so it always
> matches the real data model.

## Editing a figure

- **Mermaid figure**: edit the `.mmd` source (keep the shared `%%{init ...}%%`
  theme block), run `npm run diagrams`, and commit the source + regenerated
  `.png`/`.svg`.
- **Hand-authored figure**: replace the committed `.png` directly, keeping the
  same greyscale-legible house style and ≥ 2000 px width.
