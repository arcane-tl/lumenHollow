import { chromium } from "playwright";

const url = "http://127.0.0.1:8080/";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

const overlaps = (a, b, pad = 28) =>
  a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;

await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(500);
await page.getByRole("button", { name: /play/i }).click();
await page.waitForTimeout(500);

await page.evaluate(() => window.__controlsTest?.setPos?.(1180, 428));
await page.waitForTimeout(250);
await page.screenshot({ path: "/workspace/screenshots/lantern-unlit.png" });

await page.evaluate(() => window.__controlsTest?.setPos?.(1330, 428));
await page.waitForTimeout(350);
await page.evaluate(() => window.__controlsTest?.setPos?.(1420, 428));
await page.waitForTimeout(200);
await page.screenshot({ path: "/workspace/screenshots/lantern-lit.png" });

const layout = await page.evaluate(() => window.__controlsTest?.getLayout?.());
await page.evaluate(() => window.__controlsTest?.setPos?.(2460, 428));
await page.waitForTimeout(250);
await page.screenshot({ path: "/workspace/screenshots/spikes-path.png" });

const fail = [];
if (!layout) fail.push("no layout");
else {
  for (const cp of layout.checkpoints) {
    for (const h of layout.hazards) {
      if (overlaps(cp, h, 32)) fail.push(`checkpoint @${cp.x} overlaps hazard @${h.x}`);
    }
  }
  for (const h of layout.hazards) {
    const seated = layout.platforms.some(
      (p) => h.x + h.w > p.x + 8 && h.x < p.x + p.w - 8 && Math.abs(h.y + h.h - p.y) <= 4,
    );
    if (!seated) fail.push(`hazard @${h.x},${h.y} not seated on a platform`);
  }
  const box = { x: layout.spawnX, y: layout.spawnY, w: 28, h: 40 };
  for (const h of layout.hazards) {
    if (overlaps(box, h, 4)) fail.push(`spawn ${layout.spawnX},${layout.spawnY} on hazard @${h.x}`);
  }
}
if (errors.length) fail.push(errors.join(" | "));

await page.evaluate(() => window.__controlsTest?.startLevel?.(2));
await page.waitForTimeout(400);
const sky = await page.evaluate(() => window.__controlsTest?.getLayout?.());
if (sky) {
  for (const cp of sky.checkpoints) {
    for (const h of sky.hazards) {
      if (overlaps(cp, h, 32)) fail.push(`sky checkpoint @${cp.x} overlaps hazard @${h.x}`);
    }
  }
  for (const h of sky.hazards) {
    const seated = sky.platforms.some(
      (p) => h.x + h.w > p.x + 8 && h.x < p.x + p.w - 8 && Math.abs(h.y + h.h - p.y) <= 4,
    );
    if (!seated) fail.push(`sky hazard @${h.x},${h.y} not seated on a platform`);
  }
  const box = { x: sky.spawnX, y: sky.spawnY, w: 28, h: 40 };
  for (const h of sky.hazards) {
    if (overlaps(box, h, 4)) fail.push(`sky spawn on hazard @${h.x}`);
  }
}
console.log(JSON.stringify({ layout, sky, errors, fail }, null, 2));
if (fail.length) {
  console.error("QA FAILED:\n" + fail.join("\n"));
  process.exit(1);
}
await browser.close();
