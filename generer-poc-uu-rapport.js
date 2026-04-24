// generer-poc-uu-rapport.js
// Les poc-resultater/poc-uu-resultat.json og generer docs/poc-uu-rapport.html
// Matche styling med eksisterende rapportfiler.

import fs from 'fs';

const jsonPath = 'poc-resultater/poc-uu-resultat.json';
const utPath   = 'docs/poc-uu-rapport.html';

if (!fs.existsSync(jsonPath)) {
  console.error(`Finner ikke ${jsonPath} – kjør 'npm run poc-uu' først.`);
  process.exit(1);
}

const data   = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const stats  = data.stats;
const suites = data.suites?.[0]?.suites ?? [];

// Dato
const startTime = new Date(stats.startTime);
const dato = startTime.toISOString().slice(0,10);
const tid  = startTime.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Oslo' });
const datotid = `${dato} ${tid}`;

// Totaler
const totaltTester  = stats.expected + stats.unexpected + stats.skipped;
const totaltBestatt = stats.expected;
const totaltFeilet  = stats.unexpected;
const totaltSider   = suites.length;

// Score-klasse
const pct = totaltTester > 0 ? Math.round((totaltBestatt / totaltTester) * 100) : 0;
const scoreKlasse = pct === 100 ? 'god' : pct >= 70 ? 'middels' : 'dårlig';
const scoreFarge  = pct === 100 ? '#07604f' : pct >= 70 ? '#b8860b' : '#c53030';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// Bygg sidenavigasjon
function sidemenyLinks() {
  return suites.map(suite => {
    const url    = suite.title;
    const specs  = suite.specs ?? [];
    const feilet = specs.filter(sp => !sp.ok).length;
    const cls    = feilet > 0 ? 'har-brudd' : 'ok';
    const label  = (() => {
      try { return new URL(url).pathname || '/'; } catch { return url; }
    })();
    return `    <li>
      <a href="#side-${esc(url)}" class="sidenav-link ${cls}">
        <span class="sidenavn">${esc(label)}</span>
        <span class="side-url">${esc(url)}</span>
        <span class="side-badge">${feilet > 0 ? `${feilet} feilet` : 'OK'}</span>
      </a>
    </li>`;
  }).join('\n');
}

// Bygg innhold per side
function sideSeksjoner() {
  return suites.map(suite => {
    const url   = suite.title;
    const specs = suite.specs ?? [];
    const antallFeilet = specs.filter(sp => !sp.ok).length;
    const statusBadge  = antallFeilet > 0
      ? `<span class="badge critical">${antallFeilet} feilet</span>`
      : `<span class="badge" style="background:#ecfdf5;color:#064e3b;">Alle OK</span>`;

    const specRader = specs.map(spec => {
      const ok     = spec.ok;
      const ikon   = ok ? '✅' : '❌';
      const farge  = ok ? '#064e3b' : '#c53030';
      const bg     = ok ? '#ecfdf5' : '#fff5f5';
      const errors = spec.tests?.flatMap(t => t.results?.flatMap(r => r.errors ?? []) ?? []) ?? [];
      const errHtml = errors.length
        ? `<div class="brudd-hjelp" style="margin-top:.5rem;white-space:pre-wrap;font-size:.78rem;">${esc(errors.map(e => e.message ?? '').join('\n\n')).replace(/\n/g,'<br>')}</div>`
        : '';
      return `      <div class="brudd-kort" style="border-left-color:${farge};background:${bg};">
        <div class="brudd-header">
          <span style="font-size:.9rem;">${ikon} <strong>${esc(spec.title)}</strong></span>
          <span class="brudd-teller">${spec.tests?.[0]?.results?.[0]?.duration ?? 0}ms</span>
        </div>
        ${errHtml}
      </div>`;
    }).join('\n');

    return `  <section class="side-seksjon" id="side-${esc(url)}">
    <div class="side-header">
      <div>
        <h2>Side: ${esc((() => { try { return new URL(url).pathname || '/'; } catch { return url; } })())}</h2>
        <a class="side-url-link" href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a>
      </div>
      <div class="side-score-badges">${statusBadge}</div>
    </div>
    <div class="wcag-seksjon">
      <h3>Testresultater (${specs.length} tester)</h3>
${specRader}
    </div>
  </section>`;
  }).join('\n\n');
}

const html = `<!DOCTYPE html>
<html lang="no">
<head>
<meta charset="UTF-8">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>POC UU-rapport – ${datotid}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,-apple-system,sans-serif;background:#faf6f0;color:#0f0e17;display:flex;min-height:100vh}

  /* Sidebar */
  .sidemeny{width:272px;min-width:272px;background:#0a1355;color:white;padding:0;overflow-y:auto;position:sticky;top:0;height:100vh;display:flex;flex-direction:column}
  .sidemeny-header{padding:1.2rem 1.4rem;border-bottom:1px solid rgba(255,255,255,.1)}
  .sidemeny-logo{font-size:.7rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;opacity:.45;margin-bottom:.5rem}
  .env-badge{display:inline-block;font-size:.65rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;background:rgba(255,255,255,.18);color:white;padding:.25rem .7rem;border-radius:100px;margin-top:.5rem}
  .sidemeny h1{font-size:.95rem;font-weight:600;line-height:1.3}
  .sidemeny h1 span{display:block;font-size:.72rem;opacity:.45;margin-top:.3rem;font-weight:400}
  .sidemeny ul{list-style:none;flex:1;overflow-y:auto;padding:.5rem 0}
  .sidenav-link{display:block;padding:.65rem 1.4rem;text-decoration:none;color:rgba(255,255,255,.65);border-left:3px solid transparent;transition:background .15s,color .15s}
  .sidenav-link:hover{background:rgba(255,255,255,.07);color:white}
  .sidenav-link.har-kritiske{border-color:#fc8181}
  .sidenav-link.har-brudd{border-color:#f3dda2}
  .sidenav-link.ok{border-color:#abd1b1}
  .sidenavn{display:block;font-size:.84rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .side-url{display:block;font-size:.68rem;opacity:.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:.15rem}
  .side-badge{display:block;font-size:.68rem;margin-top:.2rem;opacity:.6}

  /* Main */
  .hoveddel{flex:1;padding:2.5rem 3rem;overflow-y:auto;max-width:1060px}

  /* Top header */
  .rapport-header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:2rem;padding-bottom:1.5rem;border-bottom:2px solid #f4ecdf;flex-wrap:wrap}
  .rapport-header h1{font-size:1.5rem;font-weight:700;color:#0a1355;letter-spacing:-.01em}
  .rapport-header .meta{font-size:.85rem;color:#6b7280;margin-top:.4rem}
  .rapport-header .meta a{color:#07604f;text-decoration:none}
  .rapport-header .meta a:hover{text-decoration:underline}
  .nav-knapper{display:flex;gap:.6rem;flex-wrap:wrap;align-items:flex-start}
  .knapp{display:inline-block;padding:.5rem 1.2rem;background:#0a1355;color:white;border-radius:100px;font-size:.82rem;font-weight:500;text-decoration:none;white-space:nowrap;transition:background .15s}
  .knapp:hover{background:#2b3285}
  .knapp.aktiv{background:#07604f;pointer-events:none}
  .knapp.sekundær{background:transparent;border:1px solid #0a1355;color:#0a1355}
  .knapp.sekundær:hover{background:#f4ecdf}

  /* POC banner */
  .poc-banner{background:#fff3cd;border:2px solid #b8860b;border-radius:6px;padding:1rem 1.4rem;margin-bottom:1.5rem;font-size:.88rem;color:#713f12}
  .poc-banner strong{display:block;font-size:1rem;color:#0a1355;margin-bottom:.35rem}

  /* Score card */
  .score-kort{background:white;border:1px solid #f1f0ee;padding:1.8rem 2rem;margin-bottom:1.5rem;display:flex;align-items:center;gap:2rem;box-shadow:0 1px 4px rgba(10,19,85,.06)}
  .score-sirkel{width:88px;height:88px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.8rem;font-weight:700;flex-shrink:0}
  .score-sirkel.god{background:#07604f;color:white}
  .score-sirkel.middels{background:#f3dda2;color:#0a1355}
  .score-sirkel.darlig{background:#c53030;color:white}
  .score-tekst strong{color:#0a1355;font-size:1rem}
  .score-tekst p{color:#6b7280;font-size:.87rem;margin-top:.35rem;line-height:1.5}

  /* Metric cards */
  .kort-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:.8rem;margin-bottom:2rem}
  .kort{background:white;padding:1.2rem 1rem;border:1px solid #f1f0ee;border-left:4px solid #e5e3de;box-shadow:0 1px 4px rgba(10,19,85,.06)}
  .kort.kritisk{border-left-color:#c53030}.kort.advarsel{border-left-color:#b8860b}.kort.ok{border-left-color:#07604f}
  .kort .tall{font-size:2rem;font-weight:700;margin:.3rem 0;color:#0a1355}
  .kort .etikett{font-size:.7rem;color:#6b7280;text-transform:uppercase;letter-spacing:.05em}
  .kort .undertekst{font-size:.7rem;color:#9ca3af;margin-top:.25rem}

  /* Page sections */
  .side-seksjon{background:white;border:1px solid #f1f0ee;padding:2rem;margin-bottom:1.2rem;box-shadow:0 1px 4px rgba(10,19,85,.06)}
  .side-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.4rem;padding-bottom:1.2rem;border-bottom:1px solid #f4ecdf;flex-wrap:wrap;gap:.6rem}
  .side-header h2{font-size:1rem;font-weight:600;color:#0a1355}
  .side-url-link{font-size:.78rem;color:#07604f;text-decoration:none;display:block;margin-top:.2rem}
  .side-url-link:hover{text-decoration:underline}
  .side-score-badges{display:flex;gap:.4rem;flex-wrap:wrap;align-items:flex-start}

  /* WCAG sections */
  .wcag-seksjon{margin-bottom:1.6rem}
  .wcag-seksjon h3{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#0a1355;margin-bottom:.9rem;padding-bottom:.4rem;border-bottom:1px solid #f4ecdf}
  .brudd-kort{background:#faf6f0;border:1px solid #f1f0ee;border-left:4px solid #e5e3de;padding:1rem 1.1rem;margin-bottom:.7rem}
  .brudd-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.5rem;gap:.5rem;flex-wrap:wrap}
  .brudd-teller{font-size:.72rem;color:#9ca3af;white-space:nowrap;flex-shrink:0}
  .brudd-hjelp{font-size:.82rem;color:#555;margin:.6rem 0;padding:.5rem .8rem;background:#f4ecdf;border-left:3px solid #b8860b}

  /* Badges */
  .badge{display:inline-block;padding:.15rem .6rem;border-radius:100px;font-size:.7rem;font-weight:600}
  .badge.critical{background:#fee2e2;color:#c53030}

  footer{text-align:center;padding:2.5rem;color:#9ca3af;font-size:.78rem;border-top:1px solid #f1f0ee;margin-top:2rem}
</style>
</head>
<body>
<nav class="sidemeny">
  <div class="sidemeny-header">
    <div class="sidemeny-logo">KS Tilskudd · UU-tester</div>
    <div class="env-badge">POC · TEST-MILJØ</div>
    <h1>POC UU-rapport <span>${datotid} · ${totaltSider} sider</span></h1>
  </div>
  <ul>
${sidemenyLinks()}
  </ul>
</nav>

<main class="hoveddel">
  <header class="rapport-header">
    <div>
      <h1>POC: UU-rapport (@playwright/test)</h1>
      <div class="meta">
        <a href="https://tilskudd.fiks.test.ks.no/" target="_blank" rel="noopener">https://tilskudd.fiks.test.ks.no/</a>
        &nbsp;· ${datotid} · ${totaltSider} sider testet · Playwright ${data.config?.version ?? ''}
      </div>
    </div>
    <div class="nav-knapper">
      <a href="rapport.html" class="knapp sekundær">UU-rapport</a>
      <a href="uu-rapport.html" class="knapp sekundær">axe-rapport</a>
      <a href="poc-uu-rapport.html" class="knapp aktiv">POC UU</a>
    </div>
  </header>

  <div class="poc-banner">
    <strong>Proof of Concept – eksperimentell rapport</strong>
    Denne rapporten er generert av en POC-implementasjon av UU-testing med
    <code>@playwright/test</code>. Teststrukturen bruker <code>test()</code>/<code>expect()</code>
    med automatisk sideisolasjon og parallelkjøring (workers: ${data.config?.workers ?? 3}).
    Eksisterende <code>uu-tester.js</code> er ikke berørt.
  </div>

  <div class="score-kort">
    <div class="score-sirkel ${scoreKlasse}" style="background:${scoreFarge};">${pct}%</div>
    <div class="score-tekst">
      <strong>${pct === 100 ? 'Alle tester bestatt' : `${totaltFeilet} test${totaltFeilet !== 1 ? 'er' : ''} feilet`}</strong>
      <p>${totaltBestatt} av ${totaltTester} tester bestatt på ${totaltSider} sider.<br>
      Varighet: ${(stats.duration / 1000).toFixed(1)}s totalt.</p>
    </div>
  </div>

  <div class="kort-grid">
    <div class="kort ok">
      <div class="etikett">Sider testet</div>
      <div class="tall">${totaltSider}</div>
      <div class="undertekst">Crawlet automatisk</div>
    </div>
    <div class="kort ok">
      <div class="etikett">Tester kjørt</div>
      <div class="tall">${totaltTester}</div>
      <div class="undertekst">4 tester per side</div>
    </div>
    <div class="kort ok">
      <div class="etikett">Bestatt</div>
      <div class="tall">${totaltBestatt}</div>
      <div class="undertekst">expected</div>
    </div>
    <div class="kort ${totaltFeilet > 0 ? 'kritisk' : 'ok'}">
      <div class="etikett">Feilet</div>
      <div class="tall">${totaltFeilet}</div>
      <div class="undertekst">unexpected</div>
    </div>
  </div>

${sideSeksjoner()}

  <footer>KS Tilskudd · UU-tester · POC @playwright/test · ${datotid}</footer>
</main>
</body>
</html>`;

fs.writeFileSync(utPath, html);
console.log(`Rapport skrevet til ${utPath}`);
