// Screenshots the built demo (yarn docs:demo first) for the README and the site home page.
// Usage: node scripts/shots.mjs
import { chromium } from 'playwright-core';

const demo = new URL('../website/public/demo-app/index.html', import.meta.url);
const out = new URL('../website/public/brand/demo.png', import.meta.url);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' });
await page.goto(demo.href);
await page.waitForTimeout(1500);
await page.screenshot({ path: out.pathname, clip: { x: 0, y: 185, width: 1280, height: 540 } });
await browser.close();
