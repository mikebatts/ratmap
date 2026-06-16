import { chromium } from "playwright";

const URL = process.env.QA_URL ?? "http://localhost:3000";
const browser = await chromium.launch();

const allErrors = {};

async function sweep(theme) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    colorScheme: theme, // drives prefers-color-scheme → app follows OS on first load
  });
  const page = await ctx.newPage();
  const errs = [];
  const aborts = [];
  page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
  page.on("requestfailed", (r) => {
    const t = r.failure()?.errorText ?? "";
    (t.includes("ERR_ABORTED") ? aborts : errs).push(`${t} ${r.url()}`);
  });
  page.on("response", (r) => r.status() >= 400 && errs.push(`HTTP ${r.status()} ${r.url()}`));

  await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(4500);
  await page.screenshot({ path: `scripts/design-${theme}-1-map.png` });

  // Confirm theme actually applied to <html>.
  const hasDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));

  // Zoom in slowly for dots + cluster counts.
  for (let i = 0; i < 4; i++) {
    await page.mouse.move(640, 450);
    await page.mouse.wheel(0, -400);
    await page.waitForTimeout(1400);
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `scripts/design-${theme}-2-zoom.png` });

  // Search + detail panel + popup.
  const search = page.getByPlaceholder(/Search an address/i);
  await search.click();
  await search.fill("broadway");
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `scripts/design-${theme}-3-search.png` });
  const results = await page.locator("ul li button").count();
  if (results > 0) {
    await page.locator("ul li button").first().click();
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `scripts/design-${theme}-4-detail.png` });
    // Close the detail panel so it doesn't cover the top-right controls.
    await page.getByRole("button", { name: "Close" }).click();
    await page.waitForTimeout(400);
  }

  // Open filter panel.
  await page.getByRole("button", { name: /Filters/i }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `scripts/design-${theme}-5-filters.png` });

  // About page.
  await page.goto(`${URL}/about`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `scripts/design-${theme}-6-about.png` });

  allErrors[theme] = { errs, aborts: aborts.length, hasDark, results };
  await ctx.close();
}

await sweep("light");
await sweep("dark");

// Mobile (dark) quick check.
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark", isMobile: true });
const mp = await m.newPage();
await mp.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
await mp.waitForTimeout(4000);
await mp.screenshot({ path: "scripts/design-mobile-dark.png" });
await m.close();

console.log("\n================ DESIGN QA ================");
for (const [theme, r] of Object.entries(allErrors)) {
  console.log(`\n[${theme}] html.dark=${r.hasDark} searchResults=${r.results} benignAborts=${r.aborts}`);
  console.log(`  REAL ERRORS: ${r.errs.length ? [...new Set(r.errs)].join("\n    ") : "(none)"}`);
}
console.log("==========================================");
await browser.close();
