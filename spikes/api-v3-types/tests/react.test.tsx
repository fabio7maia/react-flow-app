// O DOM tem de existir antes de o React ser carregado.
import { window_ as win } from './dom';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { browserHistory, scrollRestoration } from 'react-flow-app';
import { appAnalytics } from '../example/analytics';
import { App } from '../example/App';

// Cliente Segment falso: o adaptador `segment()` resolve `globalThis.analytics` em cada chamada.
const analyticsCalls: string[] = [];
(globalThis as unknown as { analytics: unknown }).analytics = {
	page: (name: string, properties: { path: string }) => analyticsCalls.push(`page ${name} ${properties.path}`),
	track: (name: string, properties?: { flow?: string }) =>
		analyticsCalls.push(`track ${name}${properties?.flow ? ` ${properties.flow}` : ''}`),
};

let root: Root;
let container: HTMLElement;
let scroll = 0;
const scrollWrites: number[] = [];

/** Deixa resolver lazy/Suspense e os popstate assíncronos do jsdom. */
const flush = async (): Promise<void> => {
	for (let i = 0; i < 4; i++) {
		await act(async () => {
			await new Promise(resolve => setTimeout(resolve, 5));
		});
	}
};

const heading = (): string | undefined => container.querySelector('h1')?.textContent ?? undefined;

const click = async (label: string): Promise<void> => {
	const button = [...container.querySelectorAll('button')].find(b => b.textContent?.trim() === label);
	if (!button) throw new Error(`Botão "${label}" não encontrado em: ${container.innerHTML}`);
	await act(async () => {
		button.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
	});
	await flush();
};

const browserBack = async (): Promise<void> => {
	win.history.back();
	await flush();
};

const render = async (hash = ''): Promise<void> => {
	win.history.replaceState(null, '', `/${hash}`);
	container = win.document.getElementById('root') as HTMLElement;
	root = createRoot(container);
	const adapters = [
		browserHistory(),
		scrollRestoration({ get: () => scroll, set: top => scrollWrites.push((scroll = top)) }),
		appAnalytics(),
	];
	await act(async () => root.render(<App adapters={adapters} />));
	await flush();
};

describe('render React real (jsdom)', () => {
	beforeEach(() => {
		analyticsCalls.length = 0;
		scrollWrites.length = 0;
		scroll = 0;
	});

	afterEach(async () => {
		await act(async () => root.unmount());
	});

	it('renderiza o passo inicial (lazy + Suspense) e escreve o URL', async () => {
		await render();

		assert.equal(heading(), 'Início');
		assert.equal(win.location.hash, '#/dashboard');
	});

	it('analytics (adaptador Segment): page views e funis desde o arranque; o dispatch navega entre flows', async () => {
		await render();
		await click('Ver carrinho');

		assert.equal(heading(), 'Carrinho');
		assert.equal(win.location.hash, '#/checkout/cart');
		assert.deepEqual(analyticsCalls, [
			'track Flow Started home',
			'page Início /dashboard',
			'track Flow Exited home',
			'track Flow Started checkout',
			'page Carrinho /checkout/cart',
		]);
	});

	it('children do FlowProvider recebem eventos, incluindo os do arranque', async () => {
		await render();
		assert.equal(win.document.title, 'Início · Loja');

		await click('Ver carrinho');

		assert.equal(win.document.title, 'Carrinho · Loja');
	});

	it('parâmetros de URL: dispatch com params e leitura tipada com useStepParams', async () => {
		await render();
		await click('Ver carrinho');
		await click('Finalizar compra');

		assert.equal(heading(), 'Pagamento da encomenda 42');
		assert.equal(win.location.hash, '#/checkout/pay/42');
		assert.ok(analyticsCalls.includes('track Checkout Started'));
	});

	it('o back do browser navega o flow (popstate real do jsdom)', async () => {
		await render();
		await click('Ver carrinho');
		await click('Entrar e comprar');
		assert.equal(heading(), 'Login');

		await browserBack();

		assert.equal(heading(), 'Carrinho');
		assert.equal(win.location.hash, '#/checkout/cart');
	});

	it('o botão Voltar (UI) recua o flow e o browser', async () => {
		await render();
		await click('Ver carrinho');
		await click('Finalizar compra');

		await click('Voltar');

		assert.equal(heading(), 'Carrinho');
		assert.equal(win.location.hash, '#/checkout/cart');
	});

	it('scroll restoration: repõe a posição quando o ecrã volta a estar montado', async () => {
		await render();
		await click('Ver carrinho');
		scroll = 640;
		await click('Finalizar compra');
		assert.equal(scroll, 0);

		await click('Voltar');

		assert.equal(heading(), 'Carrinho');
		assert.equal(scroll, 640);
	});

	it('deep link abre no passo entrypoint', async () => {
		await render('#/auth/login');

		assert.equal(heading(), 'Login');
	});

	it('deep link para um passo que não é entrypoint abre o início desse flow', async () => {
		await render('#/checkout/pay/42');

		assert.equal(heading(), 'Carrinho');
	});
});
