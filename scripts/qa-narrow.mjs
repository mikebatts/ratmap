import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 400, height: 820 }, deviceScaleFactor: 2 });
await p.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 30000 });
await p.waitForTimeout(3500);
await p.screenshot({ path: "scripts/narrow-home.png", clip: { x: 0, y: 0, width: 400, height: 120 } });
// bottom search area
await p.screenshot({ path: "scripts/narrow-bottom.png", clip: { x: 0, y: 700, width: 400, height: 120 } });
// filter sheet
await p.getByRole("button", { name: "Filters" }).click();
await p.waitForTimeout(500);
await p.screenshot({ path: "scripts/narrow-filters.png" });
await b.close();
