import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import { describe, it } from 'vitest';
import { App, defaultAdapters } from '../examples/store/App';

describe('server render (SSR)', () => {
	it('renders on the server with the default adapters (no window): the Suspense fallback of the initial step', () => {
		assert.equal(typeof (globalThis as { window?: unknown }).window, 'undefined');

		const html = renderToString(<App adapters={defaultAdapters()} />);

		assert.match(html, /Loading…/);
	});
});
