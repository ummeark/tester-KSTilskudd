import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const utDir = path.join(__dirname, 'rapporter', 'innloggingsflyt');
fs.mkdirSync(utDir, { recursive: true });

const steg = [];

async function bilde(page, nr, tittel, beskriv) {
  const fil = path.join(utDir, `steg-${nr}.png`);
  await page.screenshot({ path: fil, fullPage: false });
  steg.push({ nr, tittel, beskriv, fil: `steg-${nr}.png` });
  console.log(`📸 Steg ${nr}: ${tittel}`);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

// Steg 1 – Åpne appen
await page.goto('https://tilskudd.fiks.test.ks.no/', { waitUntil: 'domcontentloaded', timeout: 20000 });
await bilde(page, 1, 'Forside – ikke innlogget', 'Brukeren åpner https://tilskudd.fiks.test.ks.no/ og ser forsiden med Logg inn-knapp.');

// Steg 2 – Klikk Logg inn
const loggInnKnapp = page.locator('a:has-text("Logg inn"), button:has-text("Logg inn")').first();
await loggInnKnapp.scrollIntoViewIfNeeded();
await loggInnKnapp.click({ timeout: 8000 });
await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
await bilde(page, 2, 'Klikket «Logg inn»', 'Etter klikk på Logg inn blir brukeren videresendt til ID-porten innloggingsvelger.');

// Steg 3 – ID-porten selector (om vi ikke allerede er der)
if (!page.url().includes('idporten.no')) {
  await page.waitForURL(/idporten\.no/, { timeout: 15000 });
}
await bilde(page, 3, 'ID-porten – velg innloggingsmetode', 'ID-porten viser tilgjengelige innloggingsmetoder. Brukeren velger TestID.');

// Steg 4 – Klikk TestID
const testIdLenke = page.locator('a:has-text("TestID"), button:has-text("TestID")').first();
await testIdLenke.click({ timeout: 8000 });
await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
await bilde(page, 4, 'Klikket «TestID»', 'TestID-skjemaet åpnes. Her kan brukeren skrive inn personidentifikator eller hente en tilfeldig testperson.');

// Steg 5 – Fyll inn personnummer
const input = page.locator('input[type="text"], input[name="pid"], input[id="pid"]').first();
await input.clear({ timeout: 5000 });
await input.fill('10895696434', { timeout: 5000 });
await bilde(page, 5, 'Personidentifikator fylt inn', 'Brukeren skriver inn personidentifikator 10895696434 i feltet.');

// Steg 6 – Klikk Autentiser
const autentiserKnapp = page.locator('button:has-text("Autentiser"), input[value="Autentiser"]').first();
await autentiserKnapp.click({ timeout: 8000 });
await page.waitForURL(/tilskudd\.fiks\.test\.ks\.no/, { timeout: 20000 });
await bilde(page, 6, 'Autentisert – landet på /minside', 'Etter vellykket autentisering sendes brukeren tilbake til applikasjonen og lander på Min side.');

await browser.close();
console.log('\n✅ Alle steg fanget.\n');

// Generer HTML-rapport
const html = `<!DOCTYPE html>
<html lang="no">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Innloggingsflyt – KS Tilskudd</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0 }
  body { font-family: system-ui, sans-serif; background: #faf6f0; color: #0f0e17; padding: 2.5rem 2rem }
  h1 { font-size: 1.4rem; font-weight: 700; color: #0a1355; margin-bottom: .4rem }
  .meta { font-size: .82rem; color: #6b7280; margin-bottom: 2.5rem }
  .steg { display: flex; gap: 2rem; margin-bottom: 3rem; align-items: flex-start }
  .steg-nr { flex-shrink: 0; width: 44px; height: 44px; border-radius: 50%;
              background: #0a1355; color: white; display: flex; align-items: center;
              justify-content: center; font-size: 1.1rem; font-weight: 700; margin-top: .3rem }
  .steg-info { flex: 1 }
  .steg-tittel { font-size: 1rem; font-weight: 600; color: #0a1355; margin-bottom: .3rem }
  .steg-beskriv { font-size: .85rem; color: #374151; line-height: 1.6; margin-bottom: .9rem }
  .steg-bilde { width: 100%; border: 1px solid #e5e3de; border-radius: 4px;
                box-shadow: 0 2px 8px rgba(10,19,85,.08); cursor: zoom-in }
  .pil { text-align: center; font-size: 1.6rem; color: #9ca3af; margin: -1.5rem 0 1.5rem 0 }
  footer { text-align: center; font-size: .75rem; color: #9ca3af; margin-top: 3rem;
           padding-top: 1.5rem; border-top: 1px solid #e5e3de }
</style>
</head>
<body>
<h1>Innloggingsflyt – KS Tilskudd</h1>
<p class="meta">Steg-for-steg: fra forside via ID-porten TestID til Min side · ${new Date().toLocaleDateString('no-NO')}</p>

${steg.map((s, i) => `
<div class="steg">
  <div class="steg-nr">${s.nr}</div>
  <div class="steg-info">
    <div class="steg-tittel">${s.tittel}</div>
    <div class="steg-beskriv">${s.beskriv}</div>
    <a href="${s.fil}" target="_blank">
      <img src="${s.fil}" alt="${s.tittel}" class="steg-bilde">
    </a>
  </div>
</div>
${i < steg.length - 1 ? '<div class="pil">↓</div>' : ''}`).join('')}

<footer>KS Tilskudd · Innloggingsflyt · ID-porten TestID · Personidentifikator 10895696434</footer>
</body>
</html>`;

const htmlFil = path.join(utDir, 'innloggingsflyt.html');
fs.writeFileSync(htmlFil, html);
console.log(`📄 Rapport: ${htmlFil}\n`);

const { exec } = await import('child_process');
exec(`open "${htmlFil}"`);
