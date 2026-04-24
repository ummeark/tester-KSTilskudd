// poc-uu-tester.js
// POC: UU-analyse med @playwright/test
// Demonstrerer test()/expect()-struktur, automatisk sideisolasjon og parallelkjøring.
// Eksisterende uu-tester.js er ikke berørt.

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import { SIDE_TIMEOUT } from './config.js';

const sider = JSON.parse(fs.readFileSync('poc-resultater/poc-sider.json', 'utf8'));

for (const url of sider) {
  test.describe(url, () => {

    test('axe-core: ingen WCAG 2.1 AA-brudd', async ({ page }) => {
      await page.goto(url, { timeout: SIDE_TIMEOUT });
      const scanner = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      const violations = scanner.violations;
      expect(
        violations,
        violations.length
          ? `${violations.length} brudd:\n` + violations.map(v => `  [${v.impact}] ${v.id}: ${v.description}`).join('\n')
          : ''
      ).toHaveLength(0);
    });

    test('2.4.7: synlig fokus på interaktive elementer', async ({ page }) => {
      await page.goto(url, { timeout: SIDE_TIMEOUT });
      await page.keyboard.press('Tab');
      const harFokus = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return false;
        const s = getComputedStyle(el);
        return s.outlineWidth !== '0px' || s.boxShadow !== 'none';
      });
      expect(harFokus, 'Første fokuserbare element mangler synlig fokusindikator').toBe(true);
    });

    test('1.4.10: ingen horisontal rulling ved 320px (reflow)', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(url, { timeout: SIDE_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth, `Horisontal rulling oppstår: scrollWidth=${scrollWidth}px > 320px`).toBeLessThanOrEqual(320);
    });

    test('1.4.12: tekst ikke avskåret ved økt tekstmellomrom', async ({ page }) => {
      await page.goto(url, { timeout: SIDE_TIMEOUT });
      await page.addStyleTag({
        content: [
          '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }',
          'p { margin-bottom: 2em !important; }',
        ].join(' ')
      });
      await page.waitForLoadState('domcontentloaded');
      const klippet = await page.evaluate(() =>
        Array.from(document.querySelectorAll('*')).some(el => {
          const s = getComputedStyle(el);
          return s.overflow === 'hidden' && el.scrollHeight > el.clientHeight + 4;
        })
      );
      expect(klippet, 'Tekst klippes ved økt linjehøyde/mellomrom').toBe(false);
    });

  });
}
