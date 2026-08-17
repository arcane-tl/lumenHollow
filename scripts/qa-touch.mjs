import { mkdirSync } from "node:fs";
import { chromium, devices } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
mkdirSync("screenshots", { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const read = (page) =>
  page.evaluate(() => ({
    x: window.__controlsTest?.getX(),
    vx: window.__controlsTest?.getVx(),
    vy: window.__controlsTest?.getVy?.(),
    grounded: window.__controlsTest?.getGrounded?.(),
    media: window.matchMedia("(hover: none) and (pointer: coarse)").matches,
    canvas: (() => {
      const c = document.querySelector("canvas");
      if (!c) return null;
      const r = c.getBoundingClientRect();
      return { w: r.width, h: r.height, top: r.top, left: r.left };
    })(),
    view: { w: window.innerWidth, h: window.innerHeight },
    pads: [...document.querySelectorAll("[data-touch-pad]")].map((el) => el.getAttribute("data-touch-pad")),
  }));

const startPlay = async (page) => {
  const play = page.getByRole("button", { name: /^play$/i });
  await play.click();
  await page.waitForTimeout(500);
};

const fail = async (browser, message, extra) => {
  console.error(JSON.stringify({ ok: false, error: message, extra }, null, 2));
  await browser.close();
  process.exit(1);
};

// Desktop: no pads, keyboard still works.
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(600);
  await startPlay(page);
  const desktop = await read(page);
  if (desktop.pads.length) await fail(browser, "desktop showed touch pads", desktop);
  if (desktop.canvas.w < 1200 || desktop.canvas.h < 700) {
    await fail(browser, "desktop canvas is not full-bleed", desktop);
  }
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(280);
  const moved = await read(page);
  await page.keyboard.up("ArrowRight");
  if (!(moved.vx > 20)) await fail(browser, "desktop keyboard move failed", moved);
  await page.screenshot({ path: "screenshots/qa-touch-desktop.png" });
  await page.close();
}

// Phone: pads visible, full-bleed canvas, move + jump + combined.
{
  const phone = devices["iPhone 14"];
  const context = await browser.newContext({ ...phone });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(700);
  const title = await read(page);
  if (title.pads.length) await fail(browser, "pads visible on title", title);
  await startPlay(page);
  const playing = await read(page);
  if (!playing.media) await fail(browser, "iPhone context is not touch-primary", playing);
  if (playing.pads.sort().join(",") !== "jump,left,right") {
    await fail(browser, "expected left/right/jump pads while playing", playing);
  }
  if (
    !playing.canvas ||
    Math.abs(playing.canvas.w - playing.view.w) > 2 ||
    Math.abs(playing.canvas.h - playing.view.h) > 2 ||
    playing.canvas.top > 1 ||
    playing.canvas.left > 1
  ) {
    await fail(browser, "phone canvas is not full-bleed", playing);
  }

  const right = page.locator('[data-touch-pad="right"]');
  const jump = page.locator('[data-touch-pad="jump"]');
  const left = page.locator('[data-touch-pad="left"]');
  const box = await right.boundingBox();
  if (!box) await fail(browser, "right pad has no box", playing);

  await right.dispatchEvent("pointerdown", { pointerId: 1, buttons: 1, pointerType: "touch" });
  await page.waitForTimeout(320);
  const afterRight = await read(page);
  await right.dispatchEvent("pointerup", { pointerId: 1, buttons: 0, pointerType: "touch" });
  if (!(afterRight.vx > 20)) await fail(browser, "right pad did not move player", afterRight);

  await page.waitForTimeout(200);
  await left.dispatchEvent("pointerdown", { pointerId: 2, buttons: 1, pointerType: "touch" });
  await page.waitForTimeout(320);
  const afterLeft = await read(page);
  await left.dispatchEvent("pointerup", { pointerId: 2, buttons: 0, pointerType: "touch" });
  if (!(afterLeft.vx < -20)) await fail(browser, "left pad did not move player", afterLeft);

  await page.waitForTimeout(250);
  const preJump = await read(page);
  await jump.dispatchEvent("pointerdown", { pointerId: 3, buttons: 1, pointerType: "touch" });
  await page.waitForTimeout(80);
  const afterJump = await read(page);
  await jump.dispatchEvent("pointerup", { pointerId: 3, buttons: 0, pointerType: "touch" });
  if (!(afterJump.vy < preJump.vy - 80)) await fail(browser, "jump pad did not jump", { preJump, afterJump });

  await page.waitForTimeout(700);
  await right.dispatchEvent("pointerdown", { pointerId: 4, buttons: 1, pointerType: "touch" });
  await jump.dispatchEvent("pointerdown", { pointerId: 5, buttons: 1, pointerType: "touch" });
  await page.waitForTimeout(90);
  const combo = await read(page);
  await right.dispatchEvent("pointerup", { pointerId: 4, buttons: 0, pointerType: "touch" });
  await jump.dispatchEvent("pointerup", { pointerId: 5, buttons: 0, pointerType: "touch" });
  if (!(combo.vx > 10 && combo.vy < -80)) await fail(browser, "left-hand move + jump failed", combo);

  await page.screenshot({ path: "screenshots/qa-touch-phone.png" });

  await page.evaluate(() => window.__controlsTest?.setOverlay?.("paused"));
  await page.waitForTimeout(200);
  const paused = await read(page);
  if (paused.pads.length) await fail(browser, "pads still visible while paused", paused);

  await context.close();
}

await browser.close();
console.log(JSON.stringify({ ok: true }));
