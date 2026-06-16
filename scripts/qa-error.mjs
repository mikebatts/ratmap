import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
// Fail observations requests to trigger the error toast
let failNext = true;
await p.route("**/api/observations**", (route) => failNext ? route.abort() : route.continue());
await p.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 30000 });
await p.waitForTimeout(4000);
const toast = await p.getByText(/Couldn't load the latest reports/i).isVisible().catch(()=>false);
await p.screenshot({ path: "scripts/error-toast.png", clip: { x: 360, y: 0, width: 560, height: 160 } });
// Now allow requests and click Retry
failNext = false;
await p.getByRole("button", { name: "Retry" }).click();
await p.waitForTimeout(2500);
const toastGone = !(await p.getByText(/Couldn't load the latest reports/i).isVisible().catch(()=>false));
console.log("error toast shown:", toast, "| cleared after retry:", toastGone);
await b.close();
