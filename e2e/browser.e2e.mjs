// End-to-end tests in real browsers (Playwright). The build and the server come from scripts/e2e.mjs.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import { chromium, firefox, webkit } from 'playwright-core';

const BASE = process.env.BASE_URL;
const SYSTEM_CHROME = '/usr/bin/google-chrome';

const available = {
	chromium: { name: 'Chromium (Playwright)', launch: () => chromium.launch() },
	firefox: { name: 'Firefox (Playwright)', launch: () => firefox.launch() },
	webkit: { name: 'WebKit (Playwright)', launch: () => webkit.launch() },
	chrome: { name: 'Google Chrome (system)', launch: () => chromium.launch({ executablePath: SYSTEM_CHROME }) },
};

// E2E_BROWSERS=chromium,firefox,webkit (CI). Default: Chromium plus the system Chrome when present.
const selected = process.env.E2E_BROWSERS?.split(',').map(name => name.trim()) ?? [
	'chromium',
	...(existsSync(SYSTEM_CHROME) ? ['chrome'] : []),
];
const targets = selected.map(name => {
	if (!available[name]) throw new Error(`Unknown browser in E2E_BROWSERS: ${name}`);
	return available[name];
});

const heading = page => page.textContent('h1');
const waitHeading = (page, text) =>
	page.waitForFunction(expected => document.querySelector('h1')?.textContent === expected, text, { timeout: 5000 });
const click = async (page, label, next) => {
	await page.getByRole('button', { name: label, exact: true }).click();
	if (next) await waitHeading(page, next);
};
/** Click without Playwright's automatic scrolling (to test scroll restoration). */
const clickInPlace = async (page, label, next) => {
	await page.evaluate(text => [...document.querySelectorAll('button')].find(b => b.textContent === text).click(), label);
	await waitHeading(page, next);
};

for (const target of targets) {
	describe(target.name, () => {
		let browser;
		before(async () => {
			browser = await target.launch();
		});
		after(async () => {
			await browser.close();
		});

		/** `fromPrevious`: open another page first, so there is somewhere to leave to with back. */
		const open = async (hash = '', { fromPrevious = false } = {}) => {
			const page = await browser.newPage();
			if (fromPrevious) await page.goto(`${BASE}/previous.html`);
			const scripts = [];
			page.on('request', request => {
				if (request.resourceType() === 'script') scripts.push(new URL(request.url()).pathname);
			});
			await page.goto(`${BASE}/${hash}`);
			await page.waitForSelector('h1');
			return { page, scripts };
		};

		it('start: initial screen, URL, and the first page view reaches analytics', async () => {
			const { page } = await open();
			assert.equal(await heading(page), 'Home');
			assert.equal(new URL(page.url()).hash, '#/dashboard');
			assert.deepEqual(await page.evaluate(() => window.__analytics), ['track Flow Started', 'page Home /dashboard']);
			assert.equal(await page.title(), 'Home · Store');
			await page.close();
		});

		it('code splitting: the payment screen is only downloaded when visited', async () => {
			const { page, scripts } = await open();
			await click(page, 'View cart', 'Cart');
			assert.ok(!scripts.some(path => path.includes('Payment')), 'Payment loaded too early');

			await click(page, 'Checkout', 'Payment for order 42');
			assert.ok(
				scripts.some(path => path.includes('Payment')),
				'Payment was not lazy loaded'
			);
			await page.close();
		});

		it('browser back navigates the flow; forward does not navigate and restores the URL', async () => {
			const { page } = await open();
			await click(page, 'View cart', 'Cart');
			await click(page, 'Log in and buy', 'Log in');

			await page.goBack();
			await waitHeading(page, 'Cart');
			assert.equal(new URL(page.url()).hash, '#/checkout/cart');

			await page.goForward();
			await page.waitForTimeout(200);
			assert.equal(await heading(page), 'Cart');
			assert.equal(new URL(page.url()).hash, '#/checkout/cart');
			await page.close();
		});

		it('Back from the UI keeps the browser aligned (the next browser back goes to the right step)', async () => {
			const { page } = await open();
			await click(page, 'View cart', 'Cart');
			await click(page, 'Checkout', 'Payment for order 42');
			await click(page, 'Back', 'Cart');

			await page.goBack();
			await waitHeading(page, 'Home');
			assert.equal(new URL(page.url()).hash, '#/dashboard');
			await page.close();
		});

		it('after clearHistory (order complete), browser back leaves the app', async () => {
			const { page } = await open('', { fromPrevious: true });
			await click(page, 'View cart', 'Cart');
			await click(page, 'Checkout', 'Payment for order 42');
			await click(page, 'Pay', 'Order complete');

			await page.goBack();
			await page.waitForURL(`${BASE}/previous.html`, { timeout: 5000 });
			await page.close();
		});

		it('app as the first page of the tab: after clearHistory, back stays on the current step with the right URL', async t => {
			const { page } = await open();
			if ((await page.evaluate(() => history.length)) > 1) {
				// Playwright's Chromium opens the tab with an about:blank before the app.
				t.skip('this browser has an entry before the app');
				await page.close();
				return;
			}
			await click(page, 'View cart', 'Cart');
			await click(page, 'Checkout', 'Payment for order 42');
			await click(page, 'Pay', 'Order complete');

			await page.goBack();
			await page.waitForFunction(() => location.hash === '#/checkout/success', null, { timeout: 5000 });
			assert.equal(await heading(page), 'Order complete');
			await page.close();
		});

		it('scroll restoration: restores the position on back, once the screen is mounted', async () => {
			const { page } = await open();
			await click(page, 'View cart', 'Cart');
			await page.evaluate(() => window.scrollTo(0, 500));
			await page.waitForFunction(() => window.scrollY === 500);

			await clickInPlace(page, 'Checkout', 'Payment for order 42');
			assert.equal(await page.evaluate(() => window.scrollY), 0);

			await clickInPlace(page, 'Back', 'Cart');
			await page.waitForFunction(() => window.scrollY === 500, null, { timeout: 5000 });
			await page.close();
		});

		it('deep links: an entrypoint opens directly; another step opens the start of its flow; reload keeps the step', async () => {
			const login = await open('#/auth/login');
			assert.equal(await heading(login.page), 'Log in');
			await login.page.close();

			const payment = await open('#/checkout/pay/42');
			assert.equal(await heading(payment.page), 'Cart');
			assert.equal(new URL(payment.page.url()).hash, '#/checkout/cart');

			await payment.page.reload();
			await waitHeading(payment.page, 'Cart');
			await payment.page.close();
		});
	});
}
