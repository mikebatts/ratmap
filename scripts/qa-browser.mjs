import { chromium } from "playwright";

const URL = process.env.QA_URL ?? "http://localhost:3000";

const browser = await chromium.launch();
const page = await browser.newPage();

const consoleErrors = [];
const failedRequests = [];
const pageErrors = [];

page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => pageErrors.push(err.message));
page.on("requestfailed", (req) => {
  failedRequests.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText}`);
});
page.on("response", (res) => {
  if (res.status() >= 400) {
    failedRequests.push(`HTTP ${res.status()} ${res.request().method()} ${res.url()}`);
  }
});

console.log(`Loading ${URL} ...`);
await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 }).catch((e) => {
  console.log("goto error:", e.message);
});

// Give MapLibre time to load tiles + the app to fire its fetches.
await page.waitForTimeout(6000);

await page.screenshot({ path: "scripts/qa-screenshot.png", fullPage: false });

console.log("\n=== PAGE ERRORS ===");
console.log(pageErrors.length ? pageErrors.join("\n") : "(none)");
console.log("\n=== CONSOLE ERRORS ===");
console.log(consoleErrors.length ? [...new Set(consoleErrors)].join("\n") : "(none)");
console.log("\n=== FAILED REQUESTS (>=400 or network failure) ===");
console.log(failedRequests.length ? [...new Set(failedRequests)].join("\n") : "(none)");

await browser.close();
