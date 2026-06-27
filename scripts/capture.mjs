/* ============================================================================
   Alto Nivel — Captura de screenshots y videos de flujos con Playwright.
   Captura SOLO la página renderizada (nunca el escritorio del usuario).
   Uso:  npm run capture
   ========================================================================== */
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const url = "file://" + path.join(root, "index.html");
const shots = path.join(root, "docs/screenshots");
const vids = path.join(root, "docs/videos");
mkdirSync(shots, { recursive: true });
mkdirSync(vids, { recursive: true });

const wait = (page, ms) => page.waitForTimeout(ms);

// Dispara todos los scroll-reveal recorriendo la página y vuelve arriba.
async function primeReveals(page) {
  await page.evaluate(() => new Promise((res) => {
    let y = 0;
    const tick = setInterval(() => {
      y += 500; window.scrollTo(0, y);
      if (y >= document.body.scrollHeight) { clearInterval(tick); res(); }
    }, 110);
  }));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
}

async function shoot(page, selector, file) {
  const el = page.locator(selector);
  await el.scrollIntoViewIfNeeded();
  await wait(page, 700);
  await el.screenshot({ path: path.join(shots, file) });
  console.log("  📸", file);
}

async function smoothTo(page, sel) {
  await page.evaluate((s) => document.querySelector(s)
    .scrollIntoView({ behavior: "smooth", block: "start" }), sel);
}

async function recordFlow(browser, viewport, file, fn, mobile = false) {
  const ctx = await browser.newContext({
    viewport, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile,
    recordVideo: { dir: vids, size: viewport },
  });
  const page = await ctx.newPage();
  await fn(page);
  const video = page.video();
  await ctx.close();
  if (video) { await video.saveAs(path.join(vids, file)); await video.delete(); }
  console.log("  🎬", file);
}

(async () => {
  const browser = await chromium.launch();
  console.log("→ Screenshots desktop (1280×800)");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "load" });
  await wait(page, 2600);              // altímetro: cuenta 0 → 5.364
  await primeReveals(page);

  await shoot(page, "section.hero", "hero-altimetro-5364.png");
  await shoot(page, "#expediciones", "expediciones-rutas-y-precios.png");
  await shoot(page, "#guias", "guias-certificados-y-testimonio.png");
  await shoot(page, "#experiencia", "proceso-antes-de-la-cima.png");

  // Formulario con datos reales (no vacío)
  await page.locator("#contacto").scrollIntoViewIfNeeded();
  await wait(page, 600);
  await page.fill("#f-nombre", "Daniela Restrepo");
  await page.fill("#f-email", "daniela.restrepo@gmail.com");
  await page.fill("#f-wpp", "(+57) 311 245 8890");
  await page.selectOption("#f-exp", { label: "Nevado del Tolima" });
  await page.fill("#f-msg", "He hecho senderismo en el Cocuy. Quiero mi primer nevado técnico.");
  await wait(page, 400);
  await shoot(page, "#contacto", "contacto-formulario-reserva.png");
  await ctx.close();

  console.log("→ Screenshots mobile (390×844)");
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const mp = await m.newPage();
  await mp.goto(url, { waitUntil: "load" });
  await wait(mp, 2600);
  await mp.screenshot({ path: path.join(shots, "mobile-hero.png") });
  console.log("  📸 mobile-hero.png");
  await mp.click("#navToggle");
  await wait(mp, 700);
  await mp.screenshot({ path: path.join(shots, "mobile-menu-navegacion.png") });
  console.log("  📸 mobile-menu-navegacion.png");
  await m.close();

  console.log("→ Videos de flujos (solo la página)");

  // Flujo 1 — Encontrar tu expedición
  await recordFlow(browser, { width: 1280, height: 800 }, "encontrar-tu-expedicion.webm", async (p) => {
    await p.goto(url, { waitUntil: "load" });
    await wait(p, 2400);
    await smoothTo(p, "#expediciones");
    await wait(p, 1200);
    await p.click('.filter[data-filter="tecnica"]');
    await wait(p, 1400);
    await p.locator('.exp-card[data-level="tecnica"]').scrollIntoViewIfNeeded();
    await wait(p, 1800);
  });

  // Flujo 2 — Pedir información de reserva
  await recordFlow(browser, { width: 1280, height: 800 }, "pedir-informacion-de-reserva.webm", async (p) => {
    await p.goto(url, { waitUntil: "load" });
    await wait(p, 1400);
    await smoothTo(p, "#contacto");
    await wait(p, 1200);
    await p.locator("#f-nombre").pressSequentially("Daniela Restrepo", { delay: 35 });
    await p.locator("#f-email").pressSequentially("daniela.restrepo@gmail.com", { delay: 25 });
    await p.locator("#f-wpp").pressSequentially("(+57) 311 245 8890", { delay: 25 });
    await p.selectOption("#f-exp", { label: "Nevado del Tolima" });
    await wait(p, 500);
    await p.click('#contactForm button[type="submit"]');
    await wait(p, 2200);            // "Enviando…" → confirmación
  });

  // Flujo 3 — Navegación en móvil
  await recordFlow(browser, { width: 390, height: 844 }, "navegacion-en-movil.webm", async (p) => {
    await p.goto(url, { waitUntil: "load" });
    await wait(p, 2200);
    await p.click("#navToggle");
    await wait(p, 1200);
    await p.click('.mobile-nav__panel a[href="#expediciones"]');
    await wait(p, 2000);
  }, true);

  await browser.close();
  console.log("✓ Captura completa.");
})().catch((e) => { console.error("✗ Error en captura:", e); process.exit(1); });
