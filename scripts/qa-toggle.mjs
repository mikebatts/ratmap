import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
p.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
await p.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 30000 });
await p.waitForTimeout(4000);
const probe = async () => p.evaluate(() => {
  const m = window.__ratmapMap;
  return {
    hasSrc: !!(m && m.getSource("observations")),
    styleLoaded: !!(m && m.isStyleLoaded()),
    feats: m && m.getSource("observations") ? m.queryRenderedFeatures({ layers: ["clusters","unclustered-point"] }).length : -1,
  };
});
console.log("initial:", JSON.stringify(await probe()));
await p.getByRole("button", { name: /Switch to (dark|light) mode/i }).click();
for (const t of [500, 1000, 2000, 3500, 5000]) {
  await p.waitForTimeout(t === 500 ? 500 : t - (t===1000?500:t===2000?1000:t===3500?2000:3500));
  console.log(`+${t}ms dark:`, JSON.stringify(await probe()));
}
await p.getByRole("button", { name: /Switch to (dark|light) mode/i }).click();
await p.waitForTimeout(4000);
console.log("back to light:", JSON.stringify(await probe()));
console.log("errors:", errs.length ? errs.join(" | ") : "(none)");
await b.close();
