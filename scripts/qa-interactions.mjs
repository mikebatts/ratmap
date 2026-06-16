import { chromium } from "playwright";

const URL = process.env.QA_URL ?? "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("requestfailed", (r) => errors.push(`REQFAIL ${r.url()} ${r.failure()?.errorText}`));
page.on("response", (r) => r.status() >= 400 && errors.push(`HTTP ${r.status()} ${r.url()}`));

await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(3000);

// Zoom into Manhattan to break clusters into individual colored points.
await page.evaluate(() => {
  // MapLibre instance isn't globally exposed; use scroll-zoom on the canvas center.
});
for (let i = 0; i < 5; i++) {
  await page.mouse.move(640, 450);
  await page.mouse.wheel(0, -500);
  await page.waitForTimeout(700);
}
await page.waitForTimeout(2500);
await page.screenshot({ path: "scripts/qa-zoomed.png" });

// Address search flow.
const search = page.getByPlaceholder(/Search an address/i);
await search.click();
await search.fill("broadway");
await page.waitForTimeout(1200);
const optionCount = await page.locator("ul li button").count();
await page.screenshot({ path: "scripts/qa-search.png" });
let firstResult = "(none)";
if (optionCount > 0) {
  firstResult = (await page.locator("ul li button").first().innerText()).replace(/\s+/g, " ").trim();
  await page.locator("ul li button").first().click();
  await page.waitForTimeout(3500); // fly-to animation + highlight ring
  await page.screenshot({ path: "scripts/qa-flyto.png" });
}

console.log("search results:", optionCount, "| first:", firstResult);
console.log("ERRORS:", errors.length ? [...new Set(errors)].join("\n") : "(none)");
await browser.close();
