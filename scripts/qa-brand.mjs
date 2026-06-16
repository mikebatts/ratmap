import { chromium } from "playwright";
const b = await chromium.launch();
async function run(theme) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: theme, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push("ERR " + e.message));
  p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 30000 });
  await p.waitForTimeout(3500);
  // Top bar (brand + search + control capsule)
  await p.screenshot({ path: `scripts/brand-${theme}-bar.png`, clip: { x: 0, y: 0, width: 1280, height: 110 } });
  // Open filters to check dropdown anchoring under the capsule
  await p.getByRole("button", { name: /Filters/i }).click();
  await p.waitForTimeout(500);
  await p.screenshot({ path: `scripts/brand-${theme}-filters.png`, clip: { x: 760, y: 0, width: 520, height: 520 } });
  console.log(`[${theme}] errors=${errs.length ? errs.join(" | ") : "(none)"}`);
  await ctx.close();
}
await run("dark"); await run("light");
await b.close();
