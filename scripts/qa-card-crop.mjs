import { chromium } from "playwright";
const b = await chromium.launch();
async function crop(theme) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: theme, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 30000 });
  await p.waitForTimeout(3500);
  const s = p.getByPlaceholder(/Search an address/i);
  await s.click(); await s.fill("350 5th ave"); await p.waitForTimeout(1300);
  await p.locator("ul[role=listbox] li button").first().click();
  await p.waitForTimeout(3500);
  const box = await p.getByRole("dialog").boundingBox();
  if (box) await p.screenshot({ path: `scripts/card-${theme}.png`, clip: { x: box.x-16, y: box.y-16, width: box.width+32, height: box.height+32 } });
  await ctx.close();
}
await crop("dark"); await crop("light");
await b.close();
