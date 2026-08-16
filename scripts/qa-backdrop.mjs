import { chromium } from "playwright";

const url = "http://127.0.0.1:8080/";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(500);
await page.getByRole("button", { name: /play/i }).click();
await page.waitForTimeout(400);

await page.screenshot({ path: "/workspace/screenshots/bg-start.png" });

await page.evaluate(() => window.__controlsTest?.setPos?.(520, 428));
await page.waitForTimeout(200);
await page.screenshot({ path: "/workspace/screenshots/bg-mid.png" });

await page.evaluate(() => window.__controlsTest?.setPos?.(1180, 428));
await page.waitForTimeout(200);
await page.screenshot({ path: "/workspace/screenshots/bg-far.png" });

await page.evaluate(() => window.__controlsTest?.setPos?.(1280, 428));
await page.waitForTimeout(200);
await page.screenshot({ path: "/workspace/screenshots/ground-close.png" });

const wide = await browser.newPage({ viewport: { width: 1600, height: 500 } });
await wide.goto(url, { waitUntil: "networkidle", timeout: 30000 });
await wide.waitForTimeout(400);
await wide.getByRole("button", { name: /play/i }).click();
await wide.waitForTimeout(400);
await wide.evaluate(() => window.__controlsTest?.setPos?.(400, 428));
await wide.waitForTimeout(200);
await wide.screenshot({ path: "/workspace/screenshots/ground-wide.png" });

console.log(JSON.stringify({ errors }, null, 2));
if (errors.length) process.exit(1);
await browser.close();
