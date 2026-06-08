/**
 * Render Figure 12 — a clean terminal view of `docker compose ps` showing the
 * five-service containerised deployment. Faithful to the real output captured
 * from the running stack.
 *
 *   npx tsx scripts/fig12.ts
 */
import { join } from "node:path";

const OUT = join(process.cwd(), "demo-output");

const rows = [
  ["phlare-web-1", "phlare-web", "Up 15 minutes", "0.0.0.0:3000->3000/tcp"],
  ["phlare-worker-1", "phlare-worker", "Up 15 minutes", "3000/tcp"],
  ["phlare-postgres-1", "postgres:16-alpine", "Up 52 minutes (healthy)", "5432/tcp"],
  ["phlare-redis-1", "redis:7-alpine", "Up 52 minutes (healthy)", "0.0.0.0:6379->6379/tcp"],
  ["phlare-mailpit-1", "axllent/mailpit:latest", "Up 52 minutes (healthy)", "0.0.0.0:1025->1025/tcp, 0.0.0.0:8025->8025/tcp"],
];

const td = (s: string, cls = "") => `<td class="${cls}">${s}</td>`;
const statusCell = (s: string) => {
  const healthy = s.includes("healthy");
  return `<td><span class="dot ${healthy ? "g" : "b"}"></span>${s}</td>`;
};

const body = rows
  .map((r) => `<tr>${td(r[0], "name")}${td(r[1], "muted")}${statusCell(r[2])}${td(r[3], "muted")}</tr>`)
  .join("\n");

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 40px; background: #0f1117; font-family: 'Cascadia Code','JetBrains Mono','Consolas',monospace; }
  .term { width: 1080px; border-radius: 12px; overflow: hidden; box-shadow: 0 24px 60px rgba(0,0,0,.45); border: 1px solid #2a2f3a; }
  .bar { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: #1b1f2a; border-bottom: 1px solid #2a2f3a; }
  .bar .c { width: 12px; height: 12px; border-radius: 50%; }
  .bar .r { background: #ff5f56; } .bar .y { background: #ffbd2e; } .bar .gr { background: #27c93f; }
  .bar .title { margin-left: 10px; color: #8b93a7; font-size: 13px; }
  .body { padding: 22px 24px 26px; background: #0f1117; color: #d7dbe6; font-size: 14px; line-height: 1.55; }
  .prompt { color: #7aa2f7; }
  .cmd { color: #e6e9f0; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13.5px; }
  thead th { text-align: left; color: #6b7384; font-weight: 600; padding: 0 18px 10px 0; border-bottom: 1px solid #232838; letter-spacing: .03em; }
  tbody td { padding: 11px 18px 11px 0; border-bottom: 1px solid #181c27; white-space: nowrap; vertical-align: middle; }
  .name { color: #c0caf5; font-weight: 600; }
  .muted { color: #8b93a7; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; vertical-align: middle; }
  .dot.g { background: #27c93f; box-shadow: 0 0 6px #27c93f88; }
  .dot.b { background: #7aa2f7; box-shadow: 0 0 6px #7aa2f788; }
  .ok { color: #9ece6a; }
</style></head><body>
  <div class="term">
    <div class="bar"><span class="c r"></span><span class="c y"></span><span class="c gr"></span><span class="title">phlare — docker compose</span></div>
    <div class="body">
      <div><span class="prompt">$</span> <span class="cmd">docker compose ps</span></div>
      <table>
        <thead><tr><th>NAME</th><th>IMAGE</th><th>STATUS</th><th>PORTS</th></tr></thead>
        <tbody>
${body}
        </tbody>
      </table>
      <div style="margin-top:18px" class="ok">✔ all five services running — web · worker · postgres · redis · mailpit</div>
    </div>
  </div>
</body></html>`;

async function main() {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: "networkidle" });
  // Clip to the padded body so the terminal's drop-shadow is included.
  const clip = await page.evaluate(() => {
    const r = document.body.getBoundingClientRect();
    return { x: 0, y: 0, width: Math.ceil(r.width), height: Math.ceil(r.height) };
  });
  await page.screenshot({ path: join(OUT, "fig12-containers.png"), clip });
  await browser.close();
  console.log("  ✓ fig12-containers.png");
}

main().catch((e) => { console.error(e); process.exit(1); });
