// poc-crawl.setup.js
import { chromium } from 'playwright';
import fs from 'fs';
import { SIDE_TIMEOUT } from './config.js';

// In globalSetup, process.argv is from the playwright runner, so we read
// the URL directly from env or fall back to the hard-coded default.
const START_URL = process.env.TEST_URL || 'https://tilskudd.fiks.test.ks.no/';

export default async function globalSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const visited = new Set();
  const queue = [START_URL];
  const urls = [];
  const baseOrigin = new URL(START_URL).origin;

  while (queue.length && urls.length < 9) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: SIDE_TIMEOUT });
      urls.push(url);
      const hrefs = await page.locator('a[href]').evaluateAll(
        els => els.map(el => el.href)
      );
      for (const href of hrefs) {
        if (href.startsWith(baseOrigin) && !visited.has(href))
          queue.push(href);
      }
    } catch { /* skip */ }
  }

  await browser.close();
  fs.mkdirSync('poc-resultater', { recursive: true });
  fs.writeFileSync('poc-resultater/poc-sider.json', JSON.stringify(urls, null, 2));
  console.log(`\n POC-crawl: ${urls.length} sider oppdaget`);
}
