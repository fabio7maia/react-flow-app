import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { branch, createFlowApp, defineFlow, defineScreen, goto, toGraph } from 'react-flow-app';
import { check, diffGraphs, diffToMarkdown, isEmptyDiff, toMermaidDiff, toSnapshot } from 'react-flow-app/testing';
import { describe, it, vi } from 'vitest';
import { flowApp } from '../examples/store/app.flow';
import { authFlow } from '../examples/store/flows/auth.flow';
import { homeFlow } from '../examples/store/flows/home.flow';
import { cartScreen } from '../examples/store/screens/cart/cart.screen';
import { failureScreen } from '../examples/store/screens/failure/failure.screen';
import { paymentScreen } from '../examples/store/screens/payment/payment.screen';
import { successScreen } from '../examples/store/screens/success/success.screen';
import { aliasesFrom, main } from '../src/cli/index';

const root = fileURLToPath(new URL('..', import.meta.url));

/** The same checkout with a review step before payment (the "PR" under review). */
const reviewScreen = defineScreen({
	name: 'review',
	actions: ['confirm'],
	meta: { title: 'Review' },
	loader: () => import('../examples/store/screens/success/Success'),
});
const checkoutWithReview = defineFlow({
	name: 'checkout',
	baseUrl: 'checkout',
	steps: {
		cart: { screen: cartScreen, initial: true, entrypoint: true },
		review: { screen: reviewScreen },
		payment: { screen: paymentScreen, url: 'pay/:orderId', entrypoint: true },
		success: { screen: successScreen, clearHistory: true },
		failure: { screen: failureScreen, ignoreHistory: true },
	},
});
checkoutWithReview.transitions({
	cart: { checkout: branch(['review', goto('auth', 'login')], (_, p) => (p.loggedIn ? 'review' : goto('auth', 'login'))) },
	review: { confirm: 'payment' },
	payment: {
		pay: branch(['success', 'failure'], (_, p) => (p.ok ? 'success' : 'failure'), {
			samples: { success: { ok: true }, failure: { ok: false } },
		}),
		cancel: 'cart',
	},
	failure: { retry: 'payment' },
	success: { finish: goto('home', 'dashboard') },
});
const changedApp = createFlowApp([homeFlow, checkoutWithReview, authFlow]);

const before = toGraph(flowApp);
const after = toGraph(changedApp);

describe('graph diff', () => {
	it('detects new steps, changed steps and new/removed transitions', () => {
		const diff = diffGraphs(before, after);

		assert.deepEqual(
			diff.addedNodes.map(node => node.id),
			['checkout.review']
		);
		assert.deepEqual(diff.removedNodes, []);
		assert.deepEqual(diff.changedNodes, [{ id: 'checkout.payment', changes: ['became an entrypoint'] }]);
		assert.deepEqual(diff.addedEdges.map(edge => edge.id).sort(), [
			'checkout.cart:checkout->review',
			'checkout.review:confirm->payment',
		]);
		assert.deepEqual(
			diff.removedEdges.map(edge => edge.id),
			['checkout.cart:checkout->payment']
		);
	});

	it('the same graph has no diff', () => {
		assert.equal(isEmptyDiff(diffGraphs(before, toGraph(flowApp))), true);
		assert.match(diffToMarkdown(before, before), /No navigation changes/);
	});

	it('Mermaid highlights what is new and draws what was removed', () => {
		const lines = toMermaidDiff(before, after).split('\n');
		const edgeLines = lines.filter(line => /-->|-\.->/.test(line));
		const removedIndex = edgeLines.findIndex(line => line.includes('checkout_cart -->|checkout| checkout_payment'));
		const addedIndex = edgeLines.findIndex(line => line.includes('checkout_review -->|confirm| checkout_payment'));

		assert.ok(lines.includes('  class checkout_review added'));
		assert.ok(lines.includes('  class checkout_payment changed'));
		assert.ok(removedIndex >= 0, 'the removed transition is still drawn');
		assert.ok(lines.includes(`  linkStyle ${removedIndex} stroke:#cf222e,stroke-dasharray:4 3`));
		assert.ok(lines.includes(`  linkStyle ${addedIndex} stroke:#1a7f37,stroke-width:3px`));
	});

	it('the markdown summary lists the changes and the validation', () => {
		const markdown = diffToMarkdown(before, after, check(changedApp).issues);

		assert.match(markdown, /\*\*New steps\*\*\n- `checkout.review` \(review\)/);
		assert.match(markdown, /\*\*Removed transitions\*\*\n- `checkout.cart` —checkout→ `checkout.payment`/);
		assert.match(markdown, /`checkout.payment`: became an entrypoint/);
		assert.match(markdown, /```mermaid\ngraph LR/);
		// The new branch has no samples: a warning for the generated tests.
		assert.match(markdown, /\*\*Validation:\*\* 0 error\(s\), 2 warning\(s\)/);
	});
});

describe('snapshot and CI', () => {
	it('the snapshot is stable (sorted) and has no sample payloads', () => {
		const snapshot = toSnapshot(before);
		const ids = snapshot.edges.map(edge => edge.id);

		assert.deepEqual(
			ids,
			[...ids].sort((a, b) => a.localeCompare(b))
		);
		assert.ok(snapshot.edges.every(edge => !('sample' in edge)));
	});

	it('fails when the committed snapshot no longer matches the flows', () => {
		const committed = toSnapshot(before);

		assert.equal(check(flowApp, { committed }).ok, true);
		const result = check(changedApp, { committed });
		assert.equal(result.stale, true);
		assert.equal(result.ok, false);
	});

	it('--strict: warnings fail too', () => {
		assert.equal(check(changedApp).ok, true);
		assert.equal(check(changedApp, { strict: true }).ok, false);
	});

	it('the example snapshot in the repo is up to date (what CI checks)', () => {
		const committed = JSON.parse(readFileSync(new URL('../examples/store/flows.graph.json', import.meta.url), 'utf8'));
		assert.equal(check(flowApp, { committed }).stale, false);
	});
});

describe('react-flow-app check (CLI)', () => {
	const args = [
		'--app',
		'examples/store/app.flow.ts',
		'--snapshot',
		'examples/store/flows.graph.json',
		'--diagram',
		'examples/store/FLOWS.md',
	];

	it('loads the app from TypeScript (jiti) and passes with the example', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

		const code = await main(['check', ...args], root);

		const output = log.mock.calls.map(call => call.join(' ')).join('\n');
		log.mockRestore();
		assert.equal(code, 0, output);
		assert.match(output, /6 steps, 10 transitions, 0 error\(s\), 0 warning\(s\)/);
	});

	it('shows the help and fails without a command', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

		const code = await main([], root);

		log.mockRestore();
		assert.equal(code, 1);
	});
});

describe('react-flow-app check: tsconfig paths as aliases', () => {
	it('reads JSONC (comments, trailing commas, "/*" inside strings) and maps exact and prefix paths', () => {
		const dir = mkdtempSync(join(tmpdir(), 'rfa-paths-'));
		writeFileSync(
			join(dir, 'tsconfig.json'),
			`{
				// comment
				"compilerOptions": {
					/* block comment */
					"baseUrl": ".",
					"paths": {
						"@/*": ["src/*"],
						"@flows": ["src/app.flow.ts"],
						"lib/*": ["packages/*/index.ts"],
					},
				},
			}`
		);

		assert.deepEqual(aliasesFrom(dir), { '@': join(dir, 'src'), '@flows': join(dir, 'src/app.flow.ts') });
	});
});
