// Renders every thesis figure to print-quality PNG (and SVG) with a single,
// consistent theme so all figures match and stay legible in greyscale print.
//
//   node scripts/render-diagrams.mjs        (or: npm run diagrams)
//
// Sources of truth that live in the repo:
//   * docs/diagrams/fig2-threat-ecosystem.mmd   (hand-authored Mermaid)
//   * docs/diagrams/fig3-market-gap.mmd
//   * docs/diagrams/fig4-system-architecture.mmd
//   * docs/diagrams/erd.md                       (auto-generated from schema.prisma)
//
// Each is exported to a matching .png and .svg next to the source.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const diagramsDir = join(root, "docs", "diagrams");
const puppeteerConfig = join(diagramsDir, ".puppeteer.json");

// Shared render settings — scale 3 ≈ ~300 DPI for print; white background and
// the `neutral` theme keep figures readable when printed in black & white.
const COMMON = ["-t", "neutral", "-b", "white", "-s", "3", "-p", puppeteerConfig];

// Invoke mermaid-cli's JS entry directly with the current Node binary. This is
// cross-platform and avoids Node's inability to spawn the `.cmd` shim on Windows.
const mmdcCli = join(root, "node_modules", "@mermaid-js", "mermaid-cli", "src", "cli.js");

function render(inputMmd, outBase) {
  for (const ext of ["png", "svg"]) {
    const out = `${outBase}.${ext}`;
    execFileSync(process.execPath, [mmdcCli, "-i", inputMmd, "-o", out, ...COMMON], {
      stdio: "inherit",
    });
    console.log(`  ✓ ${out}`);
  }
}

if (!existsSync(diagramsDir)) mkdirSync(diagramsDir, { recursive: true });

// 1) Hand-authored conceptual + architecture figures.
// Mermaid-generated figures only. The conceptual figures (fig1, fig5, fig6,
// fig7, fig8) are hand-authored PNGs committed directly, because their manual
// layout reads more cleanly in print than the auto-generated version. Do not
// add them here or `npm run diagrams` will overwrite the hand-made files.
const figures = [
  "fig2-threat-ecosystem",
  "fig3-market-gap",
  "fig4-system-architecture",
];
for (const name of figures) {
  const src = join(diagramsDir, `${name}.mmd`);
  if (!existsSync(src)) {
    console.warn(`  ! missing ${src} — skipping`);
    continue;
  }
  console.log(`Rendering ${name}…`);
  render(src, join(diagramsDir, name));
}

// 2) ERD. Prefer the compact, hand-authored erd.mmd (thesis-ready — entities +
//    relationships + key attributes only). Fall back to extracting the full
//    auto-generated diagram from erd.md (every column) if the compact one is
//    absent.
const erdHand = join(diagramsDir, "erd.mmd");
const erdMd = join(diagramsDir, "erd.md");
if (existsSync(erdHand)) {
  console.log("Rendering erd (compact)…");
  render(erdHand, join(diagramsDir, "erd"));
} else if (existsSync(erdMd)) {
  console.log("Rendering erd (full, generated)…");
  const md = readFileSync(erdMd, "utf8");
  const match = md.match(/```mermaid\s*([\s\S]*?)```/);
  const body = match ? match[1].trim() : md.trim();
  const erdMmd = join(diagramsDir, "erd.gen.mmd");
  writeFileSync(erdMmd, body, "utf8");
  render(erdMmd, join(diagramsDir, "erd"));
} else {
  console.warn("  ! no ERD source found (erd.mmd or erd.md).");
}

console.log("\nAll diagrams rendered to docs/diagrams/.");
