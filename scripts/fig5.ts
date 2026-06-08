/**
 * Figure 5 — Evolution of phishing (timeline). Recreated as a reproducible,
 * editable source (SVG) and rasterised to PNG, replacing the previous
 * source-less hand-made PNG. No em-dashes; print-friendly greyscale.
 *
 *   npx tsx scripts/fig5.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "docs", "diagrams");
const W = 2240;
const H = 820;

// year label, description (em-dash removed from the 1995 entry)
const events: [string, string][] = [
  ["1995", "AOHell: earliest recorded use of the term “phishing”"],
  ["2000", "ILOVEYOU worm spreads via email attachments"],
  ["2001", "Early e-commerce phishing attack (E-Gold)"],
  ["2003", "eBay / PayPal domain-spoofing campaigns"],
  ["Late 2000s", "Social-media era; rise of spear phishing"],
  ["2016", "Business Email Compromise era"],
  ["2022", "Generative-AI-assisted phishing"],
  ["2025", "Record attack volumes + AI voice cloning"],
];

const n = events.length;
const xFirst = 120;
const xLast = 2120;
const cx = (i: number): number => xFirst + (i * (xLast - xFirst)) / (n - 1);
const axisY = 430;
const serif = "Georgia, 'Times New Roman', serif";

const parts: string[] = [];
parts.push(`<rect width="${W}" height="${H}" fill="white"/>`);
// horizontal axis with arrowhead
parts.push(`<line x1="48" y1="${axisY}" x2="2178" y2="${axisY}" stroke="#222" stroke-width="3"/>`);
parts.push(`<polygon points="2178,420 2202,430 2178,440" fill="#222"/>`);

for (let i = 0; i < n; i++) {
  const x = cx(i);
  // dashed connectors (year -> dot, dot -> description)
  parts.push(`<line x1="${x}" y1="118" x2="${x}" y2="${axisY - 9}" stroke="#999" stroke-width="1.5" stroke-dasharray="2,5"/>`);
  parts.push(`<line x1="${x}" y1="${axisY + 9}" x2="${x}" y2="566" stroke="#999" stroke-width="1.5" stroke-dasharray="2,5"/>`);
  parts.push(`<circle cx="${x}" cy="${axisY}" r="8" fill="#222"/>`);
  // year box
  const yw = 170, yh = 64, yx = x - yw / 2, yy = 48;
  parts.push(`<rect x="${yx}" y="${yy}" width="${yw}" height="${yh}" rx="4" fill="#f2f2f2" stroke="#222" stroke-width="1.5"/>`);
  parts.push(`<text x="${x}" y="${yy + yh / 2 + 9}" text-anchor="middle" font-family="${serif}" font-size="26" font-weight="700" fill="#111">${events[i][0]}</text>`);
  // description box (foreignObject so the text wraps + centres automatically)
  const dw = 252, dh = 234, dx = x - dw / 2, dy = 568;
  parts.push(`<rect x="${dx}" y="${dy}" width="${dw}" height="${dh}" rx="4" fill="white" stroke="#222" stroke-width="1.5"/>`);
  parts.push(`<foreignObject x="${dx}" y="${dy}" width="${dw}" height="${dh}"><div xmlns="http://www.w3.org/1999/xhtml" style="height:${dh}px;display:flex;align-items:center;justify-content:center;text-align:center;padding:0 18px;box-sizing:border-box;font-family:${serif};font-size:20px;line-height:1.42;color:#111;">${events[i][1]}</div></foreignObject>`);
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join("")}</svg>`;

async function main() {
  writeFileSync(join(OUT, "fig5-phishing-evolution.svg"), svg, "utf8");
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  await page.setViewportSize({ width: W, height: H });
  await page.setContent(`<!doctype html><html><body style="margin:0">${svg}</body></html>`, { waitUntil: "networkidle" });
  await page.screenshot({ path: join(OUT, "fig5-phishing-evolution.png"), clip: { x: 0, y: 0, width: W, height: H } });
  await browser.close();
  console.log("  ✓ fig5-phishing-evolution.svg + .png");
}

main().catch((e) => { console.error(e); process.exit(1); });
