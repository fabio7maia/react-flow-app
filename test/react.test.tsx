// @vitest-environment jsdom
import assert from 'node:assert/strict';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { browserHistory, scrollRestoration } from 'react-flow-app';
import { afterEach, beforeAll, beforeEach, describe, it } from 'vitest';
import { appAnalytics } from '../examples/store/analytics';
import { App } from '../examples/store/App';

// Fake Segment client: the `segment()` adapter resolves `globalThis.analytics` on every call.
const analyticsCalls: string[] = [];

beforeAll(() => {
	Object.assign(globalThis, {
		IS_REACT_ACT_ENVIRONMENT: true,
		analytics: {
			page: (name: string, properties: { path: string }) => analyticsCalls.push(`page ${name} ${properties.path}`),
			track: (name: string, properties?: { flow?: string }) =>
				analyticsCalls.push(`track ${name}${properties?.flow ? ` ${properties.flow}` : ''}`),
		},
	});
});

let root: Root;
let container: HTMLElement;
let scroll = 0;

/** Lets lazy/Suspense and jsdom's asynchronous popstate settle. */
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
	if (!button) throw new Error(`Button "${label}" not found in: ${container.innerHTML}`);
	await act(async () => {
		button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
	});
	await flush();
};

const browserBack = async (): Promise<void> => {
	window.history.back();
	await flush();
};

const render = async (hash = ''): Promise<void> => {
	window.history.replaceState(null, '', `/${hash}`);
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	const adapters = [browserHistory(), scrollRestoration({ get: () => scroll, set: top => (scroll = top) }), appAnalytics()];
	await act(async () => root.render(<App adapters={adapters} />));
	await flush();
};

describe('real React render (jsdom)', () => {
	beforeEach(() => {
		analyticsCalls.length = 0;
		scroll = 0;
	});

	afterEach(async () => {
		await act(async () => root.unmount());
		container.remove();
	});

	it('renders the initial step (lazy + Suspense) and writes the URL', async () => {
		await render();

		assert.equal(heading(), 'Home');
		assert.equal(window.location.hash, '#/dashboard');
	});

	it('analytics (Segment adapter): page views and funnels from the start; dispatch navigates across flows', async () => {
		await render();
		await click('View cart');

		assert.equal(heading(), 'Cart');
		assert.equal(window.location.hash, '#/checkout/cart');
		assert.deepEqual(analyticsCalls, [
			'track Flow Started home',
			'page Home /dashboard',
			'track Flow Exited home',
			'track Flow Started checkout',
			'page Cart /checkout/cart',
		]);
	});

	it('children of FlowProvider receive events, including the start ones', async () => {
		await render();
		assert.equal(document.title, 'Home · Store');

		await click('View cart');

		assert.equal(document.title, 'Cart · Store');
	});

	it('URL params: dispatch with params and typed reading with useStepParams', async () => {
		await render();
		await click('View cart');
		await click('Checkout');

		assert.equal(heading(), 'Payment for order 42');
		assert.equal(window.location.hash, '#/checkout/pay/42');
		assert.ok(analyticsCalls.includes('track Checkout Started'));
	});

	it('the browser back button navigates the flow (real jsdom popstate)', async () => {
		await render();
		await click('View cart');
		await click('Log in and buy');
		assert.equal(heading(), 'Log in');

		await browserBack();

		assert.equal(heading(), 'Cart');
		assert.equal(window.location.hash, '#/checkout/cart');
	});

	it('the Back button (UI) moves the flow and the browser back', async () => {
		await render();
		await click('View cart');
		await click('Checkout');

		await click('Back');

		assert.equal(heading(), 'Cart');
		assert.equal(window.location.hash, '#/checkout/cart');
	});

	it('scroll restoration: restores the position once the screen is mounted again', async () => {
		await render();
		await click('View cart');
		scroll = 640;
		await click('Checkout');
		assert.equal(scroll, 0);

		await click('Back');

		assert.equal(heading(), 'Cart');
		assert.equal(scroll, 640);
	});

	it('a deep link opens an entrypoint step', async () => {
		await render('#/auth/login');

		assert.equal(heading(), 'Log in');
	});

	it('a deep link to a step that is not an entrypoint opens the start of that flow', async () => {
		await render('#/checkout/pay/42');

		assert.equal(heading(), 'Cart');
	});
});
