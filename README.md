# tester-KSTilskudd-TEST

Automatiserte tester av testmiljøet [tilskudd.fiks.test.ks.no](https://tilskudd.fiks.test.ks.no/) med Playwright og axe-core.

Testene kjøres daglig på hverdager og publiseres til GitHub Pages:
**https://ummeark.github.io/tester-KSTilskudd-TEST/**

---

## Systemkrav

- **Node.js** v18 eller nyere (testet med v22)
- **macOS** (launchd-automatisering er macOS-spesifikk)
- Internettilgang til tilskudd.fiks.test.ks.no

---

## Kom i gang

```bash
# 1. Klon repoet
git clone https://github.com/ummeark/tester-KSTilskudd-TEST.git
cd tester-KSTilskudd-TEST

# 2. Installer avhengigheter (inkludert Playwright Chromium – tar litt tid)
npm install
npx playwright install chromium

# 3. Verifiser at du er i riktig miljø
npm run valider
```

---

## Kjør tester manuelt

```bash
npm run rapport      # WCAG/UU-analyse (axe-core, opptil 20 sider)
npm run monkey       # Monkey-testing (60 tilfeldige handlinger)
npm run sikkerhet    # Sikkerhetstest (hoder, cookies, HTTPS, CORS)
npm run negativ      # Negativ testing (ugyldig input, grenseverdier)
npm run ytelse       # Ytelsesmåling
```

Rapporter genereres i `rapporter/YYYY-MM-DD/` og åpnes i nettleseren automatisk.

Vil du publisere til arkivsiden på GitHub Pages:

```bash
npm run arkiv        # Kopier rapporter til docs/ og regenerer arkivsiden
git add docs/ && git commit -m "Oppdater rapporter" && git push
```

---

## Testdata

Testdatahuben inneholder 40 testordninger (10 fra Excel-fil + 30 deterministisk genererte):

**https://ummeark.github.io/tester-KSTilskudd-TEST/testdata-hub.html**

For å regenerere testdata:

```bash
npm run testdata     # Regenerer tilskudd-testdata.json og injiser i testdata-hub.html
```

---

## Automatisk kjøring (macOS launchd)

Testene kjøres automatisk på hverdager via to launchd-jobber:

| Jobb | Tidspunkt | Beskrivelse |
|------|-----------|-------------|
| `no.ks.uu-tester.plist` | 08:30 | Planlagt daglig kjøring |
| `no.ks.uu-tester-vakt.plist` | Hvert 30. min | Starter testene hvis de ikke er kjørt (fanger opp at Mac var avslått) |

Logg: `rapporter/kjoring.log`

---

## Mappestruktur

```
rapporter/YYYY-MM-DD/       Genererte rapporter per dato
  rapport.html              UU-rapport
  monkey-rapport.html       Monkey-rapport
  sikkerhet-rapport.html    Sikkerhetsrapport
  negativ-rapport.html      Negativ testrapport
  resultat.json             UU-resultater (maskinlesbart)
  monkey-resultat.json      Monkey-resultater
  sikkerhet-resultat.json   Sikkerhetsresultater
  negativ-resultat.json     Negative testresultater
  skjermbilder/             Skjermbilder fra UU-test
  skjermbilder-monkey/      Skjermbilder fra monkey-test
  skjermbilder-negativ/     Skjermbilder fra negativ test
  skjermbilder-sikkerhet/   Skjermbilder fra sikkerhetstest

docs/                       GitHub Pages
  rapport.html              Siste UU-rapport
  monkey-rapport.html       Siste monkey-rapport
  sikkerhet-rapport.html    Siste sikkerhetsrapport
  negativ-rapport.html      Siste negativ testrapport
  arkiv.html                Arkivside med historikk
  arkiv/YYYY-MM-DD/         Arkiverte rapporter
  testdata-hub.html         Testdatahub (40 ordninger)

testdata/
  generer-testdata.js       Genereringsskript
  tilskudd-testdata.json    Generert output (committes)
```

---

## Teknisk

- **Browser:** Playwright Chromium (headless), installert lokalt i prosjektet
- **UU-analyse:** axe-core via `@axe-core/playwright`
- **Modulformat:** ES modules (`import`/`export`) — ikke CommonJS
- **Miljøvalidering:** `valider-miljø.sh` og pre-commit hook hindrer krysskontaminering mellom TEST og PROD

---

## Feilsøking

**Playwright finner ikke Chromium:**
```bash
npx playwright install chromium
```

**`valider-miljø.sh` feiler:**
Sjekk at `START_URL` i testfilene peker på testmiljøet (`tilskudd.fiks.test.ks.no`), ikke produksjon.

**Testene henger eller timer ut:**
Sjekk at tilskudd.fiks.test.ks.no er tilgjengelig:
```bash
curl -I https://tilskudd.fiks.test.ks.no/
```

---

Se [CLAUDE.md](./CLAUDE.md) for detaljer beregnet på Claude Code-assistenten.
