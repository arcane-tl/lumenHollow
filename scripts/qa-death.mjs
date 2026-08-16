import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));

await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(700);
await page.evaluate(() => {
  for (const b of document.querySelectorAll("button")) {
    if (/^play$/i.test((b.textContent || "").trim())) b.click();
  }
});
await page.waitForTimeout(600);

const started = await page.evaluate(() => typeof window.__controlsTest !== "undefined");
if (!started) {
  console.error(JSON.stringify({ ok: false, error: "game did not start", errs }));
  process.exit(1);
}

const layout = await page.evaluate(() => window.__controlsTest.getLayout());
const hz = layout.hazards[0];
if (!hz) {
  console.error(JSON.stringify({ ok: false, error: "no hazard", errs }));
  process.exit(1);
}

await page.evaluate((h) => {
  window.__controlsTest.setPos(h.x + 8, h.y - 36);
}, hz);
await page.waitForTimeout(700);

const overlay = await page.evaluate(() => {
  const titles = [...document.querySelectorAll("h2")].map((el) => el.textContent || "");
  const buttons = [...document.querySelectorAll("button")].map((el) => (el.textContent || "").trim());
  return { titles, buttons, hasRespawn: buttons.some((t) => /respawn/i.test(t)) };
});

await page.screenshot({ path: "/workspace/screenshots/qa-death.png" });
await browser.close();

if (errs.length || !overlay.hasRespawn) {
  console.error(JSON.stringify({ ok: false, overlay, errs }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, overlay }, null, 2));
process.exit(0);
