import { chromium } from "playwright";

const URL = process.env.QA_URL ?? "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const consoleErrors = [];
const pageErrors = [];
const realFails = [];      // 4xx/5xx + non-abort network failures
const abortedTiles = [];   // benign ERR_ABORTED tile cancellations

page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("pageerror", (e) => pageErrors.push(e.message));
page.on("requestfailed", (r) => {
  const err = r.failure()?.errorText ?? "";
  if (err.includes("ERR_ABORTED")) abortedTiles.push(r.url());
  else realFails.push(`REQFAIL ${err} ${r.url()}`);
});
page.on("response", (r) => r.status() >= 400 && realFails.push(`HTTP ${r.status()} ${r.url()}`));

const step = (n, msg) => console.log(`\n[${n}] ${msg}`);

step(1, "Load page");
await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(4000);
await page.screenshot({ path: "scripts/qa-1-load.png" });

step(2, "Header shows real report count");
const header = await page.locator("header").innerText();
const countShown = /14,000 reports/.test(header);
console.log("    header text:", header.replace(/\s+/g, " ").trim().slice(0, 80));
console.log("    shows '14,000 reports':", countShown);

step(3, "Map canvas present + tiles loaded");
const hasCanvas = (await page.locator("canvas.maplibregl-canvas").count()) > 0;
console.log("    canvas:", hasCanvas);

step(4, "Zoom in slowly (no abort noise) to render individual points + cluster counts");
for (let i = 0; i < 4; i++) {
  await page.mouse.move(640, 450);
  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(1500);
}
await page.waitForTimeout(2000);
await page.screenshot({ path: "scripts/qa-2-zoom.png" });

step(5, "Address search returns results");
const search = page.getByPlaceholder(/Search an address/i);
await search.click();
await search.fill("broadway");
await page.waitForTimeout(1300);
const results = await page.locator("ul li button").count();
console.log("    results:", results);

step(6, "Select result -> fly-to + detail panel opens");
let panelText = "(panel not found)";
if (results > 0) {
  await page.locator("ul li button").first().click();
  await page.waitForTimeout(3500);
  const aside = page.locator("aside");
  if (await aside.count()) panelText = (await aside.first().innerText()).replace(/\s+/g, " ").trim().slice(0, 90);
  await page.screenshot({ path: "scripts/qa-3-detail.png" });
}
console.log("    detail panel:", panelText);

step(7, "Change time filter to 30 days (triggers refetch)");
const errCountBeforeFilter = realFails.length;
const range = page.locator("select").first();
if (await range.count()) {
  await range.selectOption("30d").catch(() => {});
  await page.waitForTimeout(2000);
}
console.log("    new real-fails from filter change:", realFails.length - errCountBeforeFilter);

// ---- Report ----
console.log("\n================ QA RESULT ================");
console.log("PAGE ERRORS:        ", pageErrors.length ? pageErrors.join(" | ") : "(none)");
console.log("CONSOLE ERRORS:     ", consoleErrors.length ? [...new Set(consoleErrors)].join(" | ") : "(none)");
console.log("REAL FAILED REQS:   ", realFails.length ? [...new Set(realFails)].join("\n                     ") : "(none)");
console.log("BENIGN TILE ABORTS: ", abortedTiles.length, "(expected during zoom; not errors)");
console.log("==========================================");

await browser.close();
