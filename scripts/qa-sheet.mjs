import { chromium } from "playwright";
const b = await chromium.launch();
const errs = [];
async function shot(theme) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: theme, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errs.push("PAGEERR " + e.message));
  p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 30000 });
  await p.waitForTimeout(3500);
  const s = p.getByPlaceholder(/Search an address/i);
  await s.click(); await s.fill("20 W 34th St"); await p.waitForTimeout(1300);
  await p.locator("ul[role=listbox] li button").first().click();
  await p.waitForTimeout(3500);
  const header = await p.getByRole("dialog").locator("h2").innerText().catch(() => "(none)");
  await p.screenshot({ path: `scripts/sheet-${theme}.png` });
  console.log(`[${theme}] sheet title: ${header}`);
  await ctx.close();
}
await shot("dark");
await shot("light");
console.log("errors:", errs.length ? errs.join(" | ") : "(none)");
await b.close();
