import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 380, height: 800 } });
await p.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 30000 });
await p.waitForTimeout(3500);
// brand container (has safe-t safe-x p-3)
const brand = await p.evaluate(() => {
  const el = document.querySelector('[class*="safe-t"][class*="safe-x"]');
  if (!el) return null;
  const s = getComputedStyle(el);
  return { paddingLeft: s.paddingLeft, paddingTop: s.paddingTop };
});
// search bar container
const search = await p.evaluate(() => {
  const el = document.querySelector('div[class*="bottom-0"][class*="safe-x"]');
  if (!el) return null;
  const s = getComputedStyle(el);
  return { paddingLeft: s.paddingLeft, paddingBottom: s.paddingBottom };
});
console.log("brand container:", JSON.stringify(brand));
console.log("search container:", JSON.stringify(search));
await b.close();
