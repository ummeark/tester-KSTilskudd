// generer-testverktøy-rapport.js
// Les resultater fra testverktøy-rapporter/ og generer docs/testverktøy-rapport.html

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const kildeDir  = path.join(__dirname, 'testverktøy-rapporter');
const docsDir   = path.join(__dirname, 'docs');
const utPath    = path.join(docsDir, 'testverktøy-rapport.html');
const GITHUB_PAGES_URL = 'https://ummeark.github.io/tester-KSTilskudd-TEST/';

if (!fs.existsSync(kildeDir)) {
  console.error('❌ Ingen testverktøy-rapporter/ funnet. Kjør skillen KSTilskudd-test-av-testverktøy-githubpages-TEST først.');
  process.exit(1);
}

const datoer = fs.readdirSync(kildeDir)
  .filter(f => /^\d{4}-\d{2}-\d{2}$/.test(f))
  .sort()
  .reverse();

if (datoer.length === 0) {
  console.error('❌ Ingen testresultater funnet i testverktøy-rapporter/');
  process.exit(1);
}

const sisteDato = datoer[0];
const kildeDatoDir = path.join(kildeDir, sisteDato);

function lesJson(fil) {
  const fp = path.join(kildeDatoDir, fil);
  if (!fs.existsSync(fp)) return null;
  try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch { return null; }
}

const uu       = lesJson('resultat.json');
const monkey   = lesJson('monkey-resultat.json');
const sikkerhet = lesJson('sikkerhet-resultat.json');
const negativ  = lesJson('negativ-resultat.json');
const ytelse   = lesJson('ytelse-resultat.json');

// Kopier HTML-rapporter til docs/testverktøy/YYYY-MM-DD/
const målDatoDir = path.join(docsDir, 'testverktøy', sisteDato);
fs.mkdirSync(målDatoDir, { recursive: true });

const AUTH_SCRIPT = '<script>if(location.protocol!==\'file:\'&&!sessionStorage.getItem(\'ks-auth\'))location.replace(\'logg-inn.html?redir=\'+encodeURIComponent(location.href))</script>';
const rapportFiler = ['uu-rapport.html', 'monkey-rapport.html', 'sikkerhet-rapport.html', 'negativ-rapport.html', 'ytelse-rapport.html'];

for (const fil of rapportFiler) {
  const src = path.join(kildeDatoDir, fil);
  if (fs.existsSync(src)) {
    let html = fs.readFileSync(src, 'utf-8');
    if (!html.includes('ks-auth')) {
      html = html.replace('<meta charset="UTF-8">', '<meta charset="UTF-8">\n' + AUTH_SCRIPT);
    }
    html = html.replace(/'logg-inn\.html\?redir=/g, "'../../logg-inn.html?redir=");
    html = html.replace(/href="rapport\.html"/g, 'href="../../rapport.html"');
    html = html.replace(/href="arkiv\.html"/g, 'href="../../arkiv.html"');
    fs.writeFileSync(path.join(målDatoDir, fil), html);
  }
}

function scoreKlasse(s) { return s >= 80 ? 'god' : s >= 50 ? 'middels' : 'dårlig'; }

function kortHTML({ ikon, tittel, score, detalj, lenke }) {
  const cls = score != null ? scoreKlasse(score) : 'ingen-data';
  const scoreHTML = score != null
    ? `<div class="dash-score ${cls}">${score}<span class="dash-score-enhet">/100</span></div>`
    : `<div class="dash-score" style="font-size:1.5rem;opacity:.4">Ingen data</div>`;
  const tag = lenke ? 'a' : 'div';
  const href = lenke ? ` href="${lenke}"` : '';
  return `<${tag} class="dash-kort ${cls}"${href}>
    <div class="dash-topp"><span class="dash-ikon">${ikon}</span><span class="dash-tittel">${tittel}</span></div>
    ${scoreHTML}
    <div class="dash-detalj">${detalj || ''}</div>
  </${tag}>`;
}

const norskDato = (d) => new Date(d).toLocaleDateString('nb-NO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const datoVisning = norskDato(sisteDato);
const tidspunkt = uu?.tidspunkt || monkey?.tidspunkt || '';

const uuDetalj   = uu ? `${uu.totalt?.brudd ?? '–'} brudd, ${uu.totalt?.sider ?? '–'} sider` : 'Ikke kjørt';
const monkeyDetalj = monkey ? `Score: ${monkey.score}/100` : 'Ikke kjørt';
const sikkerhetDetalj = sikkerhet ? `Score: ${sikkerhet.score}/100` : 'Ikke kjørt';
const negativDetalj = negativ ? `Score: ${negativ.score}/100` : 'Ikke kjørt';
const ytelseDetalj = ytelse ? `${ytelse.antallSider ?? ytelse.sider?.length ?? '–'} sider analysert` : 'Ikke kjørt';

const linkBase = `testverktøy/${sisteDato}`;

const html = `<!DOCTYPE html>
<html lang="no">
<head>
<meta charset="UTF-8">
<script>if(location.protocol!=='file:'&&!sessionStorage.getItem('ks-auth'))location.replace('logg-inn.html?redir='+encodeURIComponent(location.href))</script>
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Test av Testdashboard – tester-KSTilskudd-TEST</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #faf6f0; color: #0f0e17; min-height: 100vh; }

  header { background: #0a1355; color: white; padding: 1.6rem 2.5rem; }
  .header-inner { max-width: 1200px; margin: 0 auto; }
  .header-merkevare { font-size: 0.72rem; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; opacity: 0.45; margin-bottom: .4rem; }
  .env-badge { display: inline-block; font-size: .65rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; background: rgba(255,200,0,.25); color: #ffe066; padding: .25rem .7rem; border-radius: 100px; margin-bottom: .4rem; border: 1px solid rgba(255,200,0,.3); }
  header h1 { font-size: 1.4rem; font-weight: 700; }
  header p { opacity: 0.5; font-size: 0.82rem; margin-top: 0.3rem; }

  .container { max-width: 1200px; margin: 2.5rem auto; padding: 0 1.5rem; }

  .rapport-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 2px solid #f4ecdf; flex-wrap: wrap; }
  .rapport-header h2 { font-size: 1.3rem; font-weight: 700; color: #0a1355; }
  .rapport-header .meta { font-size: .85rem; color: #6b7280; margin-top: .3rem; }
  .rapport-header .url { font-size: .82rem; color: #6b7280; margin-top: .2rem; font-family: ui-monospace, monospace; }
  .nav-knapper { display: flex; gap: .6rem; flex-wrap: wrap; align-items: flex-start; }
  .knapp { display: inline-block; padding: .5rem 1.2rem; background: #0a1355; color: white; border-radius: 100px; font-size: .82rem; font-weight: 500; text-decoration: none; white-space: nowrap; transition: background .15s; }
  .knapp:hover { background: #2b3285; }
  .knapp.aktiv { background: #5b21b6; pointer-events: none; }
  .knapp.sekundær { background: transparent; border: 1px solid #0a1355; color: #0a1355; }
  .knapp.sekundær:hover { background: #f4ecdf; }

  .info-boks { background: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; padding: 1rem 1.2rem; border-radius: 6px; margin-bottom: 2rem; font-size: .85rem; color: #78350f; }
  .info-boks strong { display: block; margin-bottom: .3rem; }

  .dash-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1.2rem; margin-bottom: 2rem; }
  .dash-kort { background: white; border: 1px solid #f1f0ee; border-top: 5px solid #e5e3de; padding: 1.5rem; box-shadow: 0 1px 4px rgba(10,19,85,.06); text-decoration: none; color: inherit; display: flex; flex-direction: column; gap: 0.6rem; min-height: 200px; transition: box-shadow .15s, transform .15s; }
  .dash-kort:hover { box-shadow: 0 6px 20px rgba(10,19,85,.12); transform: translateY(-2px); }
  .dash-kort.god { border-top-color: #07604f; }
  .dash-kort.middels { border-top-color: #b8860b; }
  .dash-kort.dårlig { border-top-color: #c53030; }
  .dash-kort.ingen-data { opacity: 0.5; cursor: default; }
  .dash-topp { display: flex; align-items: flex-start; gap: 0.5rem; }
  .dash-ikon { font-size: 1.2rem; }
  .dash-tittel { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; }
  .dash-score { font-size: 2.8rem; font-weight: 800; line-height: 1; color: #0a1355; }
  .dash-score.god { color: #07604f; }
  .dash-score.middels { color: #b8860b; }
  .dash-score.dårlig { color: #c53030; }
  .dash-score-enhet { font-size: 1rem; font-weight: 400; opacity: 0.4; margin-left: 2px; }
  .dash-detalj { font-size: .82rem; color: #6b7280; }

  .historikk { background: white; border: 1px solid #f1f0ee; padding: 1.5rem; box-shadow: 0 1px 4px rgba(10,19,85,.06); margin-top: 1rem; }
  .historikk h3 { font-size: .9rem; font-weight: 700; color: #0a1355; margin-bottom: 1rem; }
  .historikk-rad { display: flex; align-items: center; gap: 1rem; padding: .6rem 0; border-bottom: 1px solid #f4ecdf; font-size: .85rem; }
  .historikk-rad:last-child { border-bottom: none; }
  .historikk-dato { color: #6b7280; min-width: 120px; }
  .historikk-lenker { display: flex; gap: .4rem; flex-wrap: wrap; }
  .historikk-lenker a { font-size: .75rem; padding: .2rem .6rem; background: #f4ecdf; border-radius: 100px; color: #0a1355; text-decoration: none; white-space: nowrap; }
  .historikk-lenker a:hover { background: #e5d8c8; }
</style>
</head>
<body>
<header>
  <div class="header-inner">
    <div class="header-merkevare">KS · Tilskudd · Testverktøy</div>
    <div class="env-badge">⚙ Test av testverktøy</div>
    <h1>Test av Testdashboard – tester-KSTilskudd-TEST</h1>
    <p>Automatiserte tester av selve testverktøyet (GitHub Pages-rapportsiden)</p>
  </div>
</header>

<div class="container">

  <div class="rapport-header">
    <div>
      <h2>Siste testkjøring</h2>
      <div class="meta">${datoVisning}${tidspunkt ? ' · ' + tidspunkt : ''}</div>
      <div class="url">Testet URL: <a href="${GITHUB_PAGES_URL}" target="_blank">${GITHUB_PAGES_URL}</a></div>
    </div>
    <div class="nav-knapper">
      <a href="rapport.html" class="knapp sekundær">Forside</a>
      <a href="arkiv.html" class="knapp sekundær">Arkiv</a>
      <a href="testverktøy-rapport.html" class="knapp aktiv">Test av testverktøy</a>
    </div>
  </div>

  <div class="info-boks">
    <strong>ℹ️ Hva testes her?</strong>
    Disse testene kjøres mot selve rapportsiden på GitHub Pages (<a href="${GITHUB_PAGES_URL}" target="_blank">${GITHUB_PAGES_URL}</a>), ikke mot tilskuddsapplikasjonen. Siden er statisk og krever ikke innlogging, så innloggingsflyt hoppes over.
  </div>

  <div class="dash-grid">
    ${kortHTML({ ikon: '♿', tittel: 'UU-rapport', score: uu?.score, detalj: uuDetalj, lenke: uu ? `${linkBase}/uu-rapport.html` : null })}
    ${kortHTML({ ikon: '🐒', tittel: 'Monkey-test', score: monkey?.score, detalj: monkeyDetalj, lenke: monkey ? `${linkBase}/monkey-rapport.html` : null })}
    ${kortHTML({ ikon: '🔐', tittel: 'Sikkerhetstest', score: sikkerhet?.score, detalj: sikkerhetDetalj, lenke: sikkerhet ? `${linkBase}/sikkerhet-rapport.html` : null })}
    ${kortHTML({ ikon: '🧪', tittel: 'Negativ test', score: negativ?.score, detalj: negativDetalj, lenke: negativ ? `${linkBase}/negativ-rapport.html` : null })}
    ${kortHTML({ ikon: '🚀', tittel: 'Ytelsestest', score: ytelse?.score, detalj: ytelseDetalj, lenke: ytelse ? `${linkBase}/ytelse-rapport.html` : null })}
  </div>

  ${datoer.length > 1 ? `
  <div class="historikk">
    <h3>Tidligere kjøringer</h3>
    ${datoer.slice(1).map(dato => {
      const datoFil = path.join(kildeDir, dato);
      const harFiler = rapportFiler.filter(f => fs.existsSync(path.join(datoFil, f)));
      return `<div class="historikk-rad">
        <span class="historikk-dato">${dato}</span>
        <div class="historikk-lenker">
          ${harFiler.map(f => {
            const navn = f.replace('-rapport.html','').replace('uu','UU').replace('monkey','Monkey').replace('sikkerhet','Sikkerhet').replace('negativ','Negativ').replace('ytelse','Ytelse');
            return `<a href="testverktøy/${dato}/${f}">${navn}</a>`;
          }).join('')}
        </div>
      </div>`;
    }).join('')}
  </div>` : ''}

</div>
</body>
</html>`;

fs.writeFileSync(utPath, html);
console.log(`✅ testverktøy-rapport.html generert → ${utPath}`);

// Kopier også eldre datoer til docs/testverktøy/
for (const dato of datoer.slice(1)) {
  const src = path.join(kildeDir, dato);
  const mål = path.join(docsDir, 'testverktøy', dato);
  fs.mkdirSync(mål, { recursive: true });
  for (const fil of rapportFiler) {
    const srcFil = path.join(src, fil);
    if (fs.existsSync(srcFil)) {
      let html2 = fs.readFileSync(srcFil, 'utf-8');
      if (!html2.includes('ks-auth')) {
        html2 = html2.replace('<meta charset="UTF-8">', '<meta charset="UTF-8">\n' + AUTH_SCRIPT);
      }
      html2 = html2.replace(/'logg-inn\.html\?redir=/g, "'../../logg-inn.html?redir=");
      html2 = html2.replace(/href="rapport\.html"/g, 'href="../../rapport.html"');
      html2 = html2.replace(/href="arkiv\.html"/g, 'href="../../arkiv.html"');
      fs.writeFileSync(path.join(mål, fil), html2);
    }
  }
}
