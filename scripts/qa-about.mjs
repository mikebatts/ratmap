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
  await p.getByRole("button", { name: "About" }).click();
  await p.waitForTimeout(700);
  const dialogShown = await p.getByRole("dialog").isVisible();
  await p.screenshot({ path: `scripts/about-${theme}.png` });
  // Escape closes
  await p.keyboard.press("Escape");
  await p.waitForTimeout(400);
  const closed = (await p.getByRole("dialog").count()) === 0;
  console.log(`[${theme}] aboutDialog=${dialogShown} escClosed=${closed}`);
  await ctx.close();
}
await shot("light");
await shot("dark");
console.log("errors:", errs.length ? errs.join(" | ") : "(none)");
await b.close();
