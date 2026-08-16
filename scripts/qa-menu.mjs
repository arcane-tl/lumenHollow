import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(800);

const mute = page.getByRole("button", { name: /mute|unmute/i });
if ((await mute.count()) === 0) throw new Error("mute button missing");

await page.keyboard.press("ArrowDown");
await page.waitForTimeout(80);
await page.keyboard.press("Space");
await page.waitForTimeout(400);
const levels = await page.locator("h2").filter({ hasText: "Levels" }).count();
if (!levels) throw new Error("arrow+space did not open Levels");

await page.keyboard.press("ArrowRight");
await page.waitForTimeout(60);
await page.keyboard.press("Space");
await page.waitForTimeout(400);
const title = await page.locator("h1").filter({ hasText: "Lumen Hollow" }).count();
if (!title) throw new Error("did not return to title via keyboard");

await page.keyboard.press("Space");
await page.waitForTimeout(500);
const playing = await page.evaluate(() => typeof window.__controlsTest !== "undefined" && window.__controlsTest.getX() !== undefined);
if (!playing) throw new Error("space on Play did not start");

await page.screenshot({ path: "/workspace/screenshots/qa-menu.png" });
await browser.close();
if (errs.length) {
  console.error(JSON.stringify({ ok: false, errs }));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true }));
