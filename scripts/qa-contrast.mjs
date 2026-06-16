import { chromium } from "playwright";
const b = await chromium.launch();
async function run(theme) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: theme, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 30000 });
  await p.waitForTimeout(3500);
  // 1) Focused + typed address field — crop top bar
  const s = p.getByPlaceholder(/Search an address/i);
  await s.click(); await s.fill("100 Bedford Ave");
  await p.waitForTimeout(1300);
  await p.screenshot({ path: `scripts/contrast-${theme}-search.png`, clip: { x: 150, y: 0, width: 760, height: 360 } });
  await p.keyboard.press("Escape");
  // 2) Popup — zoom in, click a dot
  for (let i=0;i<6;i++){ await p.mouse.move(640,450); await p.mouse.wheel(0,-420); await p.waitForTimeout(800); }
  await p.waitForTimeout(1200);
  const pt = await p.evaluate(() => { const m=window.__ratmapMap; const f=m?.queryRenderedFeatures({layers:["unclustered-point"]}); if(!f?.length) return null; const q=m.project(f[0].geometry.coordinates); return {x:q.x,y:q.y}; });
  if (pt){ await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(900);
    const box = await p.locator(".maplibregl-popup").boundingBox();
    if (box) await p.screenshot({ path: `scripts/contrast-${theme}-popup.png`, clip: { x: Math.max(0,box.x-10), y: Math.max(0,box.y-10), width: box.width+20, height: box.height+20 } });
  }
  console.log(`[${theme}] popup=${!!pt}`);
  await ctx.close();
}
await run("dark"); await run("light");
await b.close();
