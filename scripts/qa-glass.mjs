import { chromium } from "playwright";

const URL = process.env.QA_URL ?? "http://localhost:3000";
const browser = await chromium.launch();

async function shot(theme) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    colorScheme: theme,
    deviceScaleFactor: 2, // crisp, retina-like capture
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3500);

  const refract = await page.evaluate(() =>
    document.documentElement.classList.contains("glass-refract"),
  );
  const filterPresent = await page.evaluate(
    () => !!document.getElementById("liquid-glass"),
  );

  // Zoom in so colourful clusters/dots sit BEHIND the header + search glass —
  // that's where refraction + transparency are visible.
  for (let i = 0; i < 3; i++) {
    await page.mouse.move(640, 450);
    await page.mouse.wheel(0, -400);
    await page.waitForTimeout(900);
  }
  await page.waitForTimeout(1500);

  // Close-up clip of the top overlay band (brand pill + search + filters).
  await page.screenshot({
    path: `scripts/glass-${theme}-top.png`,
    clip: { x: 0, y: 0, width: 1280, height: 150 },
  });

  // Open the filter panel and clip it (large glass panel over the map).
  await page.getByRole("button", { name: /Filters/i }).click();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: `scripts/glass-${theme}-panel.png`,
    clip: { x: 880, y: 0, width: 400, height: 520 },
  });

  console.log(`[${theme}] glass-refract=${refract} filter#liquid-glass=${filterPresent}`);
  await ctx.close();
}

await shot("light");
await shot("dark");
await browser.close();
