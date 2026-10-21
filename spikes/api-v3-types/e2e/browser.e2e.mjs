// Testes e2e em browsers reais (Playwright). O servidor e o build vêm de scripts/e2e.mjs.
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
	chrome: { name: 'Google Chrome (sistema)', launch: () => chromium.launch({ executablePath: SYSTEM_CHROME }) },
};

// E2E_BROWSERS=chromium,firefox,webkit (CI). Por omissão: Chromium + o Chrome do sistema, se existir.
const selected = process.env.E2E_BROWSERS?.split(',').map(name => name.trim()) ?? [
	'chromium',
	...(existsSync(SYSTEM_CHROME) ? ['chrome'] : []),
];
const targets = selected.map(name => {
	if (!available[name]) throw new Error(`Browser desconhecido em E2E_BROWSERS: ${name}`);
	return available[name];
});

const heading = page => page.textContent('h1');
const waitHeading = (page, text) =>
	page.waitForFunction(expected => document.querySelector('h1')?.textContent === expected, text, { timeout: 5000 });
const click = async (page, label, next) => {
	await page.getByRole('button', { name: label, exact: true }).click();
	if (next) await waitHeading(page, next);
};
/** Clique sem o scroll automático do Playwright (para testar a scroll restoration). */
const clickInPlace = async (page, label, next) => {
	await page.evaluate(
		text => [...document.querySelectorAll('button')].find(b => b.textContent === text).click(),
		label
	);
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

		/** `fromPrevious`: abre primeiro outra página, para haver para onde sair com o back. */
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

		it('arranque: ecrã inicial, URL e o primeiro page view chega ao analytics', async () => {
			const { page } = await open();
			assert.equal(await heading(page), 'Início');
			assert.equal(new URL(page.url()).hash, '#/dashboard');
			assert.deepEqual(await page.evaluate(() => window.__analytics), ['track Flow Started', 'page Início /dashboard']);
			assert.equal(await page.title(), 'Início · Loja');
			await page.close();
		});

		it('code-splitting: o ecrã de pagamento só é descarregado quando é visitado', async () => {
			const { page, scripts } = await open();
			await click(page, 'Ver carrinho', 'Carrinho');
			assert.ok(!scripts.some(path => path.includes('Payment')), 'Payment carregado antes de tempo');

			await click(page, 'Finalizar compra', 'Pagamento da encomenda 42');
			assert.ok(scripts.some(path => path.includes('Payment')), 'Payment não foi carregado em lazy');
			await page.close();
		});

		it('back do browser navega o flow; forward não navega e repõe o URL', async () => {
			const { page } = await open();
			await click(page, 'Ver carrinho', 'Carrinho');
			await click(page, 'Entrar e comprar', 'Login');

			await page.goBack();
			await waitHeading(page, 'Carrinho');
			assert.equal(new URL(page.url()).hash, '#/checkout/cart');

			await page.goForward();
			await page.waitForTimeout(200);
			assert.equal(await heading(page), 'Carrinho');
			assert.equal(new URL(page.url()).hash, '#/checkout/cart');
			await page.close();
		});

		it('Voltar pela UI mantém o browser alinhado (o back seguinte do browser vai ao passo certo)', async () => {
			const { page } = await open();
			await click(page, 'Ver carrinho', 'Carrinho');
			await click(page, 'Finalizar compra', 'Pagamento da encomenda 42');
			await click(page, 'Voltar', 'Carrinho');

			await page.goBack();
			await waitHeading(page, 'Início');
			assert.equal(new URL(page.url()).hash, '#/dashboard');
			await page.close();
		});

		it('depois de clearHistory (compra concluída), o back do browser sai da app', async () => {
			const { page } = await open('', { fromPrevious: true });
			await click(page, 'Ver carrinho', 'Carrinho');
			await click(page, 'Finalizar compra', 'Pagamento da encomenda 42');
			await click(page, 'Pagar', 'Compra concluída');

			await page.goBack();
			await page.waitForURL(`${BASE}/previous.html`, { timeout: 5000 });
			await page.close();
		});

		it('app como primeira página do separador: depois de clearHistory, o back fica no passo atual com o URL certo', async t => {
			const { page } = await open();
			if ((await page.evaluate(() => history.length)) > 1) {
				// O Chromium do Playwright abre o separador com um about:blank antes da app.
				t.skip('este browser tem uma entrada antes da app');
				await page.close();
				return;
			}
			await click(page, 'Ver carrinho', 'Carrinho');
			await click(page, 'Finalizar compra', 'Pagamento da encomenda 42');
			await click(page, 'Pagar', 'Compra concluída');

			await page.goBack();
			await page.waitForFunction(() => location.hash === '#/checkout/success', null, { timeout: 5000 });
			assert.equal(await heading(page), 'Compra concluída');
			await page.close();
		});

		it('scroll restoration: repõe a posição ao voltar, depois de o ecrã estar montado', async () => {
			const { page } = await open();
			await click(page, 'Ver carrinho', 'Carrinho');
			await page.evaluate(() => window.scrollTo(0, 500));
			await page.waitForFunction(() => window.scrollY === 500);

			await clickInPlace(page, 'Finalizar compra', 'Pagamento da encomenda 42');
			assert.equal(await page.evaluate(() => window.scrollY), 0);

			await clickInPlace(page, 'Voltar', 'Carrinho');
			await page.waitForFunction(() => window.scrollY === 500, null, { timeout: 5000 });
			await page.close();
		});

		it('deep links: entrypoint abre direto; outro passo abre o início do flow; reload mantém o passo', async () => {
			const login = await open('#/auth/login');
			assert.equal(await heading(login.page), 'Login');
			await login.page.close();

			const payment = await open('#/checkout/pay/42');
			assert.equal(await heading(payment.page), 'Carrinho');
			assert.equal(new URL(payment.page.url()).hash, '#/checkout/cart');

			await payment.page.reload();
			await waitHeading(payment.page, 'Carrinho');
			await payment.page.close();
		});
	});
}
