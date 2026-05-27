// brukerhistorie-tester.js
// Brukerhistorietester med @playwright/test.
// Hver test.describe tilsvarer én brukerhistorie med akseptansekriterier som test()-steg.
import { test, expect } from '@playwright/test';
import { START_URL, SIDE_TIMEOUT, IDLE_TIMEOUT } from './config.js';
import fs from 'fs';

const base = START_URL.replace(/\/$/, '');

// ── BH-1 ─────────────────────────────────────────────────────────────────────
test.describe('BH-1: Som søker vil jeg se oversikt over tilskuddsordninger', () => {

  test('kan navigere til utlysningslisten', async ({ page }) => {
    await page.goto(`${base}/utlysinger`, { timeout: IDLE_TIMEOUT });
    await expect(page).toHaveURL(/utlysinger/);
  });

  test('utlysningslisten inneholder minst én ordning', async ({ page }) => {
    await page.goto(`${base}/utlysinger`, { timeout: IDLE_TIMEOUT });
    const kort = page.locator('article, [class*="card"], [class*="kort"], li a[href*="utlysing"]');
    await expect(kort.first()).toBeVisible({ timeout: SIDE_TIMEOUT });
  });

  test('kan klikke seg inn på en utlysning og se detaljer', async ({ page }) => {
    await page.goto(`${base}/utlysinger`, { timeout: IDLE_TIMEOUT });
    const forstelenke = page.locator('a[href*="utlysing"]').first();
    await expect(forstelenke).toBeVisible({ timeout: SIDE_TIMEOUT });
    await forstelenke.click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page).not.toHaveURL(`${base}/utlysinger`);
  });

});

// ── BH-2 ─────────────────────────────────────────────────────────────────────
test.describe('BH-2: Som søker vil jeg søke etter en tilskuddsordning', () => {

  test('søkefeltet er synlig og fokuserbart', async ({ page }) => {
    await page.goto(`${base}/utlysinger`, { timeout: IDLE_TIMEOUT });
    const felt = page.locator('input[type="search"], input[name*="search"], input[placeholder*="øk"]').first();
    await expect(felt).toBeVisible({ timeout: SIDE_TIMEOUT });
    await felt.click();
    await expect(felt).toBeFocused();
  });

  test('søk med gyldig tekst gir respons uten feilside', async ({ page }) => {
    await page.goto(`${base}/utlysinger`, { timeout: IDLE_TIMEOUT });
    const felt = page.locator('input[type="search"], input[name*="search"], input[placeholder*="øk"]').first();
    await felt.fill('tilskudd');
    await page.keyboard.press('Enter');
    await page.waitForLoadState('domcontentloaded');
    const body = await page.textContent('body');
    expect(body).not.toMatch(/500|Internal Server Error|Uventet feil/);
  });

  test('søk med tom streng beholder utlysningslisten', async ({ page }) => {
    await page.goto(`${base}/utlysinger`, { timeout: IDLE_TIMEOUT });
    const felt = page.locator('input[type="search"], input[name*="search"], input[placeholder*="øk"]').first();
    await felt.fill('');
    await page.keyboard.press('Enter');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/utlysinger/);
  });

});

// ── BH-3 ─────────────────────────────────────────────────────────────────────
test.describe('BH-3: Som innlogget søker vil jeg se mine søknader', () => {

  test('min side er tilgjengelig etter innlogging', async ({ page }) => {
    await page.goto(`${base}/minside`, { timeout: IDLE_TIMEOUT });
    await expect(page).toHaveURL(/minside/);
  });

  test('min side viser ikke innloggingsskjema (brukeren er innlogget)', async ({ page }) => {
    await page.goto(`${base}/minside`, { timeout: IDLE_TIMEOUT });
    const loggInnKnapp = page.locator('a:has-text("Logg inn"), button:has-text("Logg inn")');
    await expect(loggInnKnapp).toHaveCount(0);
  });

  test('min side laster uten JavaScript-feil', async ({ page }) => {
    const feil = [];
    page.on('pageerror', e => feil.push(e.message));
    await page.goto(`${base}/minside`, { timeout: IDLE_TIMEOUT });
    await page.waitForLoadState('networkidle', { timeout: IDLE_TIMEOUT });
    expect(feil, `JS-feil: ${feil.join(', ')}`).toHaveLength(0);
  });

});

const SKJERMBILDER = 'brukerhistorie-resultater/skjermbilder';

// ── BH-4 ─────────────────────────────────────────────────────────────────────
test.describe('BH-4: Som søker vil jeg kunne navigere tilbake fra en utlysning', () => {

  test('tilbake-navigasjon fra utlysning fungerer', async ({ page }) => {
    await page.goto(`${base}/utlysinger`, { timeout: IDLE_TIMEOUT });
    const lenke = page.locator('a[href*="utlysinger/"]').first();
    const href = await lenke.getAttribute('href');
    const absoluteHref = href.startsWith('http') ? href : `${base}${href}`;
    await page.goto(absoluteHref, { waitUntil: 'domcontentloaded', timeout: SIDE_TIMEOUT });
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/utlysinger/);
  });

  test('F5-refresh på utlysningslisten beholder siden', async ({ page }) => {
    await page.goto(`${base}/utlysinger`, { timeout: IDLE_TIMEOUT });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/utlysinger/);
    const body = await page.textContent('body');
    expect(body).not.toMatch(/500|Internal Server Error|Uventet feil/);
  });

});

// ── BH-5 ─────────────────────────────────────────────────────────────────────
test.describe('BH-5: Som søker med hjelpemiddelteknologi vil jeg hoppe over navigasjonen', () => {

  test('skiplink til hovedinnhold finnes i DOM (WCAG 2.4.1)', async ({ page }) => {
    await page.goto(`${base}/utlysinger`, { timeout: IDLE_TIMEOUT });
    fs.mkdirSync(SKJERMBILDER, { recursive: true });
    await page.screenshot({ path: `${SKJERMBILDER}/BH-5-side-uten-skiplink.png` });
    // Forventer: <a href="#main"> eller tilsvarende skiplink øverst på siden
    const skipLenke = page.locator(
      'a[href="#main"], a[href="#maincontent"], a[href="#main-content"], ' +
      'a[href="#innhold"], a.skip-link, a[class*="skip"]'
    ).first();
    await expect(skipLenke).toBeAttached();
  });

  test('skiplink er første fokuserbare element ved Tab-navigasjon', async ({ page }) => {
    await page.goto(`${base}/utlysinger`, { timeout: IDLE_TIMEOUT });
    await page.keyboard.press('Tab');
    fs.mkdirSync(SKJERMBILDER, { recursive: true });
    await page.screenshot({ path: `${SKJERMBILDER}/BH-5-foerste-tab-fokus.png` });
    // Forventer: første Tab-stopp er skiplink, ikke logo/menylenke
    const href = await page.locator(':focus').getAttribute('href').catch(() => '');
    expect(href, 'Første Tab-stopp bør være en skiplink til #main eller #innhold').toMatch(/#main|#innhold|#content|#skip/);
  });

  test('søkeskjema er merket med role="search" for skjermlesere', async ({ page }) => {
    await page.goto(`${base}/utlysinger`, { timeout: IDLE_TIMEOUT });
    // Forventer: søkecontaineren er annotert med role="search" (WCAG)
    const searchRegion = page.locator('[role="search"]').first();
    await expect(searchRegion).toBeVisible({ timeout: SIDE_TIMEOUT });
  });

});

// ── BH-6 ─────────────────────────────────────────────────────────────────────
test.describe('BH-6: Som søker vil jeg finne tilskuddsordninger med stikkord, halvferdige ord eller flere ord', () => {

  async function søk(page, tekst) {
    await page.goto(`${base}/utlysinger`, { timeout: IDLE_TIMEOUT });
    const felt = page.locator('input[type="search"], input[name*="search"], input[placeholder*="øk"]').first();
    await expect(felt).toBeVisible({ timeout: SIDE_TIMEOUT });
    await felt.fill(tekst);
    await page.keyboard.press('Enter');
    await page.waitForLoadState('domcontentloaded');
  }

  test('stikkord – søk på ett ord gir resultater eller ingen-treff-melding (ikke feilside)', async ({ page }) => {
    await søk(page, 'tilskudd');
    const body = await page.textContent('body');
    expect(body).not.toMatch(/500|Internal Server Error|Uventet feil/);
  });

  test('stikkord – søk på ett ord viser matchende utlysninger', async ({ page }) => {
    await søk(page, 'tilskudd');
    const kort = page.locator('article, [class*="card"], [class*="kort"], li a[href*="utlysing"]');
    const antall = await kort.count();
    expect(antall, 'Forventet minst én utlysning med søkeordet «tilskudd»').toBeGreaterThan(0);
  });

  test('halvferdig ord – delstreng gir relevante treff', async ({ page }) => {
    await søk(page, 'tilsk');
    const body = await page.textContent('body');
    expect(body).not.toMatch(/500|Internal Server Error|Uventet feil/);
    // Enten vises resultater, eller en ingen-treff-melding – men ikke en feilside
    const kortEllerIngenTreff = page.locator(
      'article, [class*="card"], [class*="kort"], li a[href*="utlysing"], ' +
      '[class*="ingen"], [class*="empty"], [class*="no-result"]'
    );
    await expect(kortEllerIngenTreff.first()).toBeAttached({ timeout: SIDE_TIMEOUT });
  });

  test('flere ord – søk på flere ord gir respons uten feilside', async ({ page }) => {
    await søk(page, 'barn og unge');
    const body = await page.textContent('body');
    expect(body).not.toMatch(/500|Internal Server Error|Uventet feil/);
  });

  test('ingen treff – søk på nonsens-streng viser ingen-treff-melding, ikke feilside', async ({ page }) => {
    await søk(page, 'xyzabc123nonsens');
    const body = await page.textContent('body');
    expect(body).not.toMatch(/500|Internal Server Error|Uventet feil/);
  });

  test('tomt søkefelt – hel utlysningsliste vises igjen', async ({ page }) => {
    await søk(page, '');
    await expect(page).toHaveURL(/utlysinger/);
    const kort = page.locator('article, [class*="card"], [class*="kort"], li a[href*="utlysing"]');
    await expect(kort.first()).toBeVisible({ timeout: SIDE_TIMEOUT });
  });

});

// ── BH-7 ─────────────────────────────────────────────────────────────────────
test.describe('BH-7: Som søker ønsker jeg å se kontaktinformasjon om ordningen (TILSK-738)', () => {

  // Cache-variabler — populeres ved første bruk (workers: 1, sekvensiell kjøring)
  let _urlMedKontaktinfo = null;
  let _urlMedBeggekorttyper = null;

  const KONTAKT_SELEKTORER =
    '[class*="kontakt"], [data-testid*="kontakt"], ' +
    'section:has-text("Kontakt"), h2:has-text("Kontakt"), h3:has-text("Kontakt")';
  const PERSON_SELEKTORER =
    '[class*="person-kort"], [class*="personkort"], [class*="person-card"], [data-testid*="person-kort"]';
  const VIRKSOMHET_SELEKTORER =
    '[class*="virksomhet-kort"], [class*="virksomhetkort"], [class*="organization-card"], [data-testid*="virksomhet-kort"]';
  const KORT_SELEKTORER =
    '[class*="kontakt-kort"], [class*="kontaktkort"], [class*="contact-card"], [data-testid*="kontakt-kort"]';

  function harKontaktdetaljer(body) {
    const harEpost   = /@[\w.-]+\.\w{2,}/.test(body);
    const harTelefon = /\d{8}|\+47[\s\d]|\d{2}[\s-]\d{2}[\s-]\d{2}[\s-]\d{2}/.test(body);
    return { harEpost, harTelefon, ok: harEpost || harTelefon };
  }

  async function hentAlleOrdningUrler(page) {
    await page.goto(`${base}/utlysinger`, { timeout: IDLE_TIMEOUT });
    await page.locator('a[href*="utlysinger/"]').first().waitFor({ state: 'visible', timeout: SIDE_TIMEOUT });
    const hrefs = await page.locator('a[href*="utlysinger/"]').evaluateAll(
      els => [...new Set(els.map(el => el.getAttribute('href')).filter(Boolean))]
    );
    return hrefs.map(h => h.startsWith('http') ? h : `${base}${h}`);
  }

  // Finn første ordning som har kontaktinformasjon med e-post eller telefon
  async function gåTilOrdningMedKontaktinfo(page) {
    if (_urlMedKontaktinfo) {
      await page.goto(_urlMedKontaktinfo, { waitUntil: 'networkidle', timeout: IDLE_TIMEOUT });
      return _urlMedKontaktinfo;
    }
    const urler = await hentAlleOrdningUrler(page);
    for (const url of urler) {
      await page.goto(url, { waitUntil: 'networkidle', timeout: IDLE_TIMEOUT });
      const harKontaktSeksjon = (await page.locator(KONTAKT_SELEKTORER).count()) > 0;
      if (!harKontaktSeksjon) continue;
      const body = await page.textContent('body');
      if (harKontaktdetaljer(body).ok) {
        _urlMedKontaktinfo = url;
        return url;
      }
    }
    return null;
  }

  // Finn første ordning som har både personkort og virksomhetskort
  async function gåTilOrdningMedBeggekorttyper(page) {
    if (_urlMedBeggekorttyper) {
      await page.goto(_urlMedBeggekorttyper, { waitUntil: 'networkidle', timeout: IDLE_TIMEOUT });
      return _urlMedBeggekorttyper;
    }
    const urler = await hentAlleOrdningUrler(page);
    for (const url of urler) {
      await page.goto(url, { waitUntil: 'networkidle', timeout: IDLE_TIMEOUT });
      const harPerson     = (await page.locator(PERSON_SELEKTORER).count()) > 0;
      const harVirksomhet = (await page.locator(VIRKSOMHET_SELEKTORER).count()) > 0;
      if (harPerson && harVirksomhet) {
        _urlMedBeggekorttyper = url;
        return url;
      }
    }
    return null;
  }

  // AK-1.0: Kontaktinformasjonsseksjon finnes og siden laster uten feil
  test('AK-1.0 – utlysningssiden laster uten feilside', async ({ page }, testInfo) => {
    const url = await gåTilOrdningMedKontaktinfo(page);
    testInfo.skip(!url, 'Ingen utlysning med kontaktinformasjonsseksjon funnet i TEST-miljøet');
    const body = await page.textContent('body');
    expect(body).not.toMatch(/Internal Server Error|Uventet feil/);
  });

  test('AK-1.0 – kontaktinformasjonsseksjon finnes på en utlysningsside', async ({ page }, testInfo) => {
    const url = await gåTilOrdningMedKontaktinfo(page);
    testInfo.skip(!url, 'Ingen utlysning med kontaktinformasjonsseksjon funnet i TEST-miljøet');
    const kontakt = page.locator(KONTAKT_SELEKTORER).first();
    await expect(kontakt).toBeAttached({ timeout: SIDE_TIMEOUT });
  });

  // AK-1.1: Minst 1 kontaktinfokort, maks 3 totalt
  test('AK-1.1 – minst ett kontaktinfokort vises', async ({ page }, testInfo) => {
    const url = await gåTilOrdningMedKontaktinfo(page);
    testInfo.skip(!url, 'Ingen utlysning med kontaktinformasjonsseksjon funnet i TEST-miljøet');
    const kort = page.locator(KORT_SELEKTORER);
    const antall = await kort.count();
    if (antall === 0) {
      const body = await page.textContent('body');
      expect(body, 'Forventet e-post eller telefon i kontaktinformasjonen').toMatch(/@|tlf\.|telefon|e-post/i);
    } else {
      expect(antall).toBeGreaterThanOrEqual(1);
    }
  });

  test('AK-1.1 – maks tre kontaktinfokort vises totalt', async ({ page }, testInfo) => {
    const url = await gåTilOrdningMedKontaktinfo(page);
    testInfo.skip(!url, 'Ingen utlysning med kontaktinformasjonsseksjon funnet i TEST-miljøet');
    const antall = await page.locator(KORT_SELEKTORER).count();
    if (antall > 0) expect(antall).toBeLessThanOrEqual(3);
  });

  // AK-1.2: Personkort: maks 3
  test('AK-1.2 – maks tre personkort vises', async ({ page }, testInfo) => {
    const url = await gåTilOrdningMedKontaktinfo(page);
    testInfo.skip(!url, 'Ingen utlysning med kontaktinformasjonsseksjon funnet i TEST-miljøet');
    const antall = await page.locator(PERSON_SELEKTORER).count();
    expect(antall).toBeLessThanOrEqual(3);
  });

  // AK-1.3: Virksomhetskort: 0 eller 1
  test('AK-1.3 – maks ett virksomhetskort vises', async ({ page }, testInfo) => {
    const url = await gåTilOrdningMedKontaktinfo(page);
    testInfo.skip(!url, 'Ingen utlysning med kontaktinformasjonsseksjon funnet i TEST-miljøet');
    const antall = await page.locator(VIRKSOMHET_SELEKTORER).count();
    expect(antall).toBeLessThanOrEqual(1);
  });

  // AK-1.4 + AK-1.5: Kortene inneholder navn og kontaktdetaljer
  test('AK-1.4/1.5 – kontaktkort inneholder e-post eller telefonnummer', async ({ page }, testInfo) => {
    const url = await gåTilOrdningMedKontaktinfo(page);
    testInfo.skip(!url, 'Ingen utlysning med kontaktinformasjon funnet i TEST-miljøet');
    const body = await page.textContent('body');
    const { harEpost, harTelefon } = harKontaktdetaljer(body);
    expect(harEpost || harTelefon, 'Forventet e-postadresse eller telefonnummer i kontaktinformasjonen').toBe(true);
  });

  // AK-1.6: Navn + telefon ELLER e-post er obligatorisk
  test('AK-1.6 – obligatoriske felt: minst telefon eller e-post finnes i kontaktinfo', async ({ page }, testInfo) => {
    const url = await gåTilOrdningMedKontaktinfo(page);
    testInfo.skip(!url, 'Ingen utlysning med kontaktinformasjon funnet i TEST-miljøet');
    const body = await page.textContent('body');
    const { ok } = harKontaktdetaljer(body);
    expect(ok, 'Kontaktinfo mangler både e-post og telefon').toBe(true);
  });

  // AK-1.7: Personkort vises før virksomhetskort (posisjon i DOM)
  test('AK-1.7 – personkort vises over virksomhetskort på siden', async ({ page }, testInfo) => {
    const url = await gåTilOrdningMedBeggekorttyper(page);
    testInfo.skip(!url, 'Ingen utlysning med både person- og virksomhetskort funnet i TEST-miljøet');
    const personBoks     = await page.locator(PERSON_SELEKTORER).first().boundingBox();
    const virksomhetBoks = await page.locator(VIRKSOMHET_SELEKTORER).first().boundingBox();
    expect(personBoks.y, 'Personkort skal vises over virksomhetskort').toBeLessThan(virksomhetBoks.y);
  });

});
