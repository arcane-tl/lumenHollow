import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

mkdirSync("/workspace/screenshots", { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const page = await browser.newPage({ viewport: { width: 1400, height: 720 } });
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));

const resp = await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(800);
await page.evaluate(() => {
  for (const b of document.querySelectorAll("button")) {
    if (/play/i.test(b.textContent || "")) b.click();
  }
});
await page.waitForTimeout(700);
const has = await page.evaluate(() => typeof window.__controlsTest !== "undefined");
if (has) {
  await page.evaluate(() => window.__controlsTest.setPos(220, 428));
  await page.waitForTimeout(200);
}
await page.screenshot({ path: "/workspace/screenshots/ground-continuous.png" });
console.log(JSON.stringify({ status: resp?.status(), errs, has }));
await browser.close();
process.exit(0);
