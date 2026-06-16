import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark", isMobile: true });
const p = await ctx.newPage();
await p.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 30000 });
await p.waitForTimeout(3500);
// focus + type to check focused-field opacity
const s = p.getByPlaceholder(/Search an address/i);
await s.click(); await s.fill("Bedford");
await p.waitForTimeout(400);
await p.screenshot({ path: "scripts/brand-mobile.png", clip: { x: 0, y: 0, width: 390, height: 180 } });
await b.close();
