import { chromium } from "playwright";

// Regression check for the popup-anchoring bug: clicking a dot must open the
// popup ON the dot, not at the top-left (0,0) corner.
const URL = process.env.QA_URL ?? "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(3000);

// Zoom to street level so individual dots render.
for (let i = 0; i < 6; i++) {
  await page.mouse.move(640, 450);
  await page.mouse.wheel(0, -420);
  await page.waitForTimeout(800);
}
await page.waitForTimeout(1500);

const dot = await page.evaluate(() => {
  const m = window.__ratmapMap;
  if (!m) return null;
  const feats = m.queryRenderedFeatures({ layers: ["unclustered-point"] });
  if (!feats.length) return null;
  const p = m.project(feats[0].geometry.coordinates);
  return { x: p.x, y: p.y };
});

if (!dot) {
  console.log("RESULT: SKIP — no unclustered dot rendered to click");
  await browser.close();
  process.exit(0);
}

await page.mouse.click(dot.x, dot.y);
await page.waitForTimeout(900);

const box = await page.locator(".maplibregl-popup").boundingBox();
if (!box) {
  console.log("RESULT: FAIL — no popup appeared");
  await browser.close();
  process.exit(1);
}

// The popup's anchor point should sit near the dot. MapLibre anchors the popup
// so its tip is at the dot; the popup box center-x should be within ~180px and
// it must NOT be pinned to the top-left corner.
const popupCenterX = box.x + box.width / 2;
const dxFromDot = Math.abs(popupCenterX - dot.x);
const atTopLeft = box.x < 40 && box.y < 40;

console.log(`dot=(${dot.x.toFixed(0)},${dot.y.toFixed(0)}) popupBox=(${box.x.toFixed(0)},${box.y.toFixed(0)} ${box.width.toFixed(0)}x${box.height.toFixed(0)})`);
console.log(`|popupCenterX - dotX| = ${dxFromDot.toFixed(0)}px, atTopLeft=${atTopLeft}`);

const pass = !atTopLeft && dxFromDot < 200;
console.log(`RESULT: ${pass ? "PASS — popup anchored to dot" : "FAIL — popup mis-positioned"}`);
await browser.close();
process.exit(pass ? 0 : 1);
