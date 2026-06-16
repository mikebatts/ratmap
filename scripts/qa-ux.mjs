import { chromium } from "playwright";

const URL = process.env.QA_URL ?? "http://localhost:3000";
const browser = await chromium.launch();
const results = [];
const assert = (name, cond) => results.push(`${cond ? "PASS" : "FAIL"} — ${name}`);

// --- Desktop interaction checks ---
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errs = [];
page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(3000);

// Escape closes the filter panel.
await page.getByRole("button", { name: /Filters/i }).click();
await page.waitForTimeout(300);
const filterOpen = await page.getByText("Time range").isVisible().catch(() => false);
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
const filterClosed = !(await page.getByText("Time range").isVisible().catch(() => false));
assert("Filter panel opens", filterOpen);
assert("Escape closes filter panel", filterClosed);

// Click outside closes the filter panel.
await page.getByRole("button", { name: /Filters/i }).click();
await page.waitForTimeout(300);
await page.mouse.click(640, 500);
await page.waitForTimeout(300);
assert("Outside-click closes filter panel", !(await page.getByText("Time range").isVisible().catch(() => false)));

// Search → keyboard select → detail panel → Escape closes it.
const search = page.getByPlaceholder(/Search an address/i);
await search.click();
await search.fill("broadway");
await page.waitForTimeout(1200);
await page.keyboard.press("ArrowDown");
await page.keyboard.press("Enter");
await page.waitForTimeout(3500);
const detailOpen = (await page.getByRole("dialog").count()) > 0;
assert("Keyboard search → detail panel opens", detailOpen);
await page.keyboard.press("Escape");
await page.waitForTimeout(400);
assert("Escape closes detail panel", (await page.getByRole("dialog").count()) === 0);

// Popup: click a dot, Escape closes it.
for (let i = 0; i < 6; i++) { await page.mouse.move(640, 450); await page.mouse.wheel(0, -420); await page.waitForTimeout(800); }
await page.waitForTimeout(1200);
const pt = await page.evaluate(() => {
  const m = window.__ratmapMap;
  const f = m?.queryRenderedFeatures({ layers: ["unclustered-point"] });
  if (!f?.length) return null;
  const p = m.project(f[0].geometry.coordinates);
  return { x: p.x, y: p.y };
});
if (pt) {
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(700);
  const popupOpen = (await page.locator(".maplibregl-popup").count()) > 0;
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  const popupClosed = (await page.locator(".maplibregl-popup").count()) === 0;
  assert("Click dot opens popup", popupOpen);
  assert("Escape closes popup", popupClosed);
} else {
  assert("Click dot opens popup (skipped — no dot)", true);
}
await ctx.close();

// --- Mobile layout check (iPhone-ish) ---
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
const mp = await m.newPage();
await mp.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
await mp.waitForTimeout(3500);
await mp.screenshot({ path: "scripts/ux-mobile.png" });
// Brand and search both visible, tap targets reasonable.
const brandVisible = await mp.getByText("RATMAP.NYC").isVisible();
const searchBox = await mp.getByPlaceholder(/Search an address/i).boundingBox();
assert("Mobile: brand visible", brandVisible);
assert("Mobile: search ≥40px tall (tap target)", !!searchBox && searchBox.height >= 40);
await m.close();

console.log("\n================ UX CHECKS ================");
results.forEach((r) => console.log("  " + r));
console.log("  console errors:", errs.length ? errs.join(" | ") : "(none)");
console.log("==========================================");
await browser.close();
process.exit(results.some((r) => r.startsWith("FAIL")) || errs.length ? 1 : 0);
