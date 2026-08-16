/**
 * Guards the two visual regressions that keep coming back:
 *  1. A flat empty bar along the top of the playfield
 *  2. A mismatched slab under the main ground bank
 * Also asserts the on-screen Left/Right/Jump pad is gone.
 *
 * Exit 0 on pass, 1 on fail. Run before shipping.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const OUT = "/workspace/screenshots";
mkdirSync(OUT, { recursive: true });

function rowStats(data, width, y, x0, x1) {
  let n = 0;
  let r = 0;
  let g = 0;
  let b = 0;
  let lumVar = 0;
  const lums = [];
  for (let x = x0; x < x1; x++) {
    const i = (y * width + x) * 4;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    lums.push(0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2]);
    n += 1;
  }
  const meanL = lums.reduce((a, v) => a + v, 0) / n;
  for (const L of lums) lumVar += (L - meanL) ** 2;
  return { r: r / n, g: g / n, b: b / n, meanL, std: Math.sqrt(lumVar / n) };
}

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const issues = [];
try {
  for (const [name, w, h] of [
    ["wide", 1400, 720],
    ["square", 900, 900],
    ["tall", 390, 844],
  ]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(700);
    await page.evaluate(() => {
      for (const b of document.querySelectorAll("button")) {
        if (/^play$/i.test((b.textContent || "").trim())) b.click();
      }
    });
    await page.waitForTimeout(800);
    const has = await page.evaluate(() => typeof window.__controlsTest !== "undefined");
    if (!has) {
      issues.push(`${name}: game did not start`);
      await page.close();
      continue;
    }
    await page.evaluate(() => window.__controlsTest.setPos(220, 428));
    await page.waitForTimeout(250);

    const shot = `${OUT}/qa-frame-${name}.png`;
    await page.screenshot({ path: shot });

    const pad = await page.evaluate(() => {
      const labels = [...document.querySelectorAll("button, [aria-label]")].map(
        (el) => (el.getAttribute("aria-label") || el.textContent || "").trim(),
      );
      return labels.filter((t) => /^(left|right|jump)$/i.test(t));
    });
    if (pad.length) issues.push(`${name}: touch pad still present (${pad.join(",")})`);

    const metrics = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      if (!canvas) return null;
      const src = document.createElement("canvas");
      src.width = canvas.width;
      src.height = canvas.height;
      const sctx = src.getContext("2d");
      sctx.drawImage(canvas, 0, 0);
      const { width, height } = src;
      const img = sctx.getImageData(0, 0, width, height).data;
      const band = (y0, y1, x0, x1) => {
        let n = 0;
        let r = 0;
        let g = 0;
        let b = 0;
        const lums = [];
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const i = (y * width + x) * 4;
            r += img[i];
            g += img[i + 1];
            b += img[i + 2];
            lums.push(0.3 * img[i] + 0.59 * img[i + 1] + 0.11 * img[i + 2]);
            n += 1;
          }
        }
        const meanL = lums.reduce((a, v) => a + v, 0) / n;
        let v = 0;
        for (const L of lums) v += (L - meanL) ** 2;
        return { r: r / n, g: g / n, b: b / n, meanL, std: Math.sqrt(v / n), n };
      };
      const midX0 = Math.floor(width * 0.28);
      const midX1 = Math.floor(width * 0.72);
      return {
        width,
        height,
        topBar: band(0, Math.max(4, Math.floor(height * 0.018)), midX0, midX1),
        topSky: band(Math.floor(height * 0.06), Math.floor(height * 0.12), midX0, midX1),
        cliff: band(Math.floor(height * 0.72), Math.floor(height * 0.82), midX0, midX1),
        footer: band(Math.floor(height * 0.9), Math.floor(height * 0.99), midX0, midX1),
      };
    });

    if (!metrics) {
      issues.push(`${name}: no canvas`);
      await page.close();
      continue;
    }

    const { topBar, topSky, cliff, footer } = metrics;
    const topIsFlat = topBar.std < 7;
    const topIsNavy = topBar.b > topBar.r + 18 && topBar.meanL < 70;
    const topDarkerThanSky = topSky.meanL - topBar.meanL > 28;
    if ((topIsFlat && topIsNavy) || (topIsFlat && topDarkerThanSky)) {
      issues.push(
        `${name}: top bar (std=${topBar.std.toFixed(1)} L=${topBar.meanL.toFixed(0)} rgb=${topBar.r.toFixed(0)},${topBar.g.toFixed(0)},${topBar.b.toFixed(0)})`,
      );
    }

    const footerMuchDarker = cliff.meanL - footer.meanL > 38;
    const footerFlatter = cliff.std > 14 && footer.std < cliff.std * 0.45;
    if (footerMuchDarker && footerFlatter) {
      issues.push(
        `${name}: bottom slab (cliff L=${cliff.meanL.toFixed(0)} std=${cliff.std.toFixed(1)} vs footer L=${footer.meanL.toFixed(0)} std=${footer.std.toFixed(1)})`,
      );
    }

    if (errs.length) issues.push(`${name}: ${errs.join(" | ")}`);
    writeFileSync(`${OUT}/qa-frame-${name}.json`, JSON.stringify({ name, metrics, pad, errs }, null, 2));
    await page.close();
  }
} finally {
  await browser.close();
}

if (issues.length) {
  console.error(JSON.stringify({ ok: false, issues }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true }, null, 2));
process.exit(0);
