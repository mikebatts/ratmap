import { chromium } from "playwright";

const URL = process.env.QA_URL ?? "http://localhost:3000";
const browser = await chromium.launch();

async function run(theme) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    colorScheme: theme,
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
  page.on("response", (r) => r.status() >= 400 && errs.push(`HTTP ${r.status()} ${r.url()}`));

  await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3500);

  // Top bar (reorganized hierarchy) close-up.
  await page.screenshot({ path: `scripts/cr-${theme}-topbar.png`, clip: { x: 0, y: 0, width: 1280, height: 130 } });

  // Zoom to street level so individual dots are visible.
  for (let i = 0; i < 5; i++) {
    await page.mouse.move(640, 450);
    await page.mouse.wheel(0, -420);
    await page.waitForTimeout(900);
  }
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `scripts/cr-${theme}-dots.png`, clip: { x: 360, y: 220, width: 560, height: 460 } });

  // Find a real rendered dot via the exposed map and click its screen point.
  const pt = await page.evaluate(() => {
    const m = window.__ratmapMap;
    if (!m) return null;
    const feats = m.queryRenderedFeatures({ layers: ["unclustered-point"] });
    if (!feats.length) return null;
    const c = feats[0].geometry.coordinates;
    const p = m.project(c);
    return { x: p.x, y: p.y };
  });
  const dot = !!pt;
  if (pt) {
    await page.mouse.move(pt.x, pt.y); // trigger hover-grow first
    await page.waitForTimeout(400);
    await page.mouse.click(pt.x, pt.y);
    await page.waitForTimeout(700);
  }
  const popupShown = (await page.locator(".maplibregl-popup").count()) > 0;
  if (popupShown) {
    await page.screenshot({ path: `scripts/cr-${theme}-popup.png` });
  }

  console.log(`[${theme}] dotClickFound=${dot} popupShown=${popupShown} errors=${errs.length ? errs.join(" | ") : "(none)"}`);
  await ctx.close();
}

await run("dark");
await run("light");
await browser.close();
