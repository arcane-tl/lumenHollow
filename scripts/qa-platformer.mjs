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
await page.waitForTimeout(600);

const play = page.getByRole("button", { name: /play/i });
await play.click();
await page.waitForTimeout(400);

const read = () =>
  page.evaluate(() => ({
    x: window.__controlsTest?.getX(),
    y: window.__controlsTest?.getY(),
    vx: window.__controlsTest?.getVx(),
    vy: window.__controlsTest?.getVy?.(),
    facing: window.__controlsTest?.getFacing(),
    grounded: window.__controlsTest?.getGrounded?.(),
    jumpsLeft: window.__controlsTest?.getJumpsLeft?.(),
  }));

const beforeMove = await read();
await page.keyboard.down("ArrowRight");
await page.waitForTimeout(350);
const afterArrowRight = await read();
await page.keyboard.up("ArrowRight");
await page.keyboard.down("ArrowLeft");
await page.waitForTimeout(350);
const afterArrowLeft = await read();
await page.keyboard.up("ArrowLeft");

await page.waitForTimeout(250);
const preTap = await read();
await page.keyboard.press("Space");
await page.waitForTimeout(80);
const afterTap = await read();

await page.waitForTimeout(700);
const afterLand = await read();
const preHold = await read();
await page.keyboard.down("Space");
await page.waitForTimeout(80);
const afterHold = await read();
await page.keyboard.up("Space");
await page.waitForTimeout(140);
const midAir = await read();
await page.keyboard.press("Space");
await page.waitForTimeout(80);
const afterDouble = await read();

await page.waitForTimeout(900);
const preArm = await read();
await page.evaluate(() => window.__controlsTest?.armJump?.());
await page.waitForTimeout(80);
const afterArm = await read();

await page.screenshot({ path: "/workspace/screenshots/jump-fix.png" });

const result = {
  beforeMove,
  afterArrowRight,
  afterArrowLeft,
  preTap,
  afterTap,
  afterLand,
  preHold,
  afterHold,
  midAir,
  afterDouble,
  preArm,
  afterArm,
  errors,
};
console.log(JSON.stringify(result, null, 2));

const fail = [];
if ((afterArrowRight.vx ?? 0) <= 20) fail.push("ArrowRight did not move right");
if ((afterArrowLeft.vx ?? 0) >= -20) fail.push("ArrowLeft did not move left");
if ((afterTap.y ?? 0) >= (preTap.y ?? 0) - 8) fail.push("Space tap did not jump");
if (afterTap.jumpsLeft !== 1) fail.push(`tap consumed wrong jumpsLeft=${afterTap.jumpsLeft}`);
if ((afterHold.y ?? 999) >= (preHold.y ?? 0) - 8) fail.push("held Space did not jump");
if ((afterDouble.jumpsLeft ?? 1) !== 0) fail.push(`double jump did not consume air jump, jumpsLeft=${afterDouble.jumpsLeft}`);
if ((afterDouble.vy ?? 0) > -200) fail.push(`double jump vy too weak: ${afterDouble.vy}`);
if ((afterArm.y ?? 0) >= (preArm.y ?? 0) - 8 && afterArm.grounded) fail.push("armJump did not jump");
if (errors.length) fail.push(`console errors: ${errors.join(" | ")}`);
if (fail.length) {
  console.error("QA FAILED:\n" + fail.join("\n"));
  process.exit(1);
}
await browser.close();
