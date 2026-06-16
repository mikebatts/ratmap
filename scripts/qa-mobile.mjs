import { chromium, devices } from "playwright";
const b = await chromium.launch();
const errs = [];
async function run(theme) {
  const ctx = await b.newContext({ ...devices["iPhone 13"], colorScheme: theme });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errs.push(`[${theme}] PAGEERR ` + e.message));
  p.on("console", (m) => m.type() === "error" && errs.push(`[${theme}] ` + m.text()));
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 30000 });
  await p.waitForTimeout(4000);
  // 1) Home — bottom search bar, brand, controls
  await p.screenshot({ path: `scripts/m-${theme}-home.png` });
  // input font size (iOS zoom guard)
  const fs = await p.getByPlaceholder(/Search an address/i).evaluate((el) => getComputedStyle(el).fontSize);
  // 2) Filters bottom sheet (the bug fix)
  await p.getByRole("button", { name: "Filters" }).click();
  await p.waitForTimeout(600);
  const sheet = await p.getByRole("dialog", { name: "Filters" }).isVisible().catch(()=>false);
  await p.screenshot({ path: `scripts/m-${theme}-filters.png` });
  await p.getByRole("button", { name: "Done" }).click();
  await p.waitForTimeout(400);
  // 3) Search dropdown opens upward
  const s = p.getByPlaceholder(/Search an address/i);
  await s.click(); await s.fill("bedford ave");
  await p.waitForTimeout(1300);
  await p.screenshot({ path: `scripts/m-${theme}-search.png` });
  console.log(`[${theme}] inputFontSize=${fs} filterSheet=${sheet}`);
  await ctx.close();
}
await run("light"); await run("dark");
console.log("ERRORS:", errs.length ? errs.join("\n  ") : "(none)");
await b.close();
