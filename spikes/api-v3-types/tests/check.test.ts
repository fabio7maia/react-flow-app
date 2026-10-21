import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
	branch,
	check,
	createFlowApp,
	defineFlow,
	defineScreen,
	diffGraphs,
	diffToMarkdown,
	goto,
	isEmptyDiff,
	toGraph,
	toMermaidDiff,
	toSnapshot,
} from 'react-flow-app';
import { flowApp } from '../example/app.flow';
import { authFlow } from '../example/flows/auth.flow';
import { homeFlow } from '../example/flows/home.flow';
import { cartScreen } from '../example/screens/cart/cart.screen';
import { failureScreen } from '../example/screens/failure/failure.screen';
import { paymentScreen } from '../example/screens/payment/payment.screen';
import { successScreen } from '../example/screens/success/success.screen';

/** O mesmo checkout com um passo de revisão antes do pagamento (o "PR" que estamos a rever). */
const reviewScreen = defineScreen({
	name: 'review',
	actions: ['confirm'],
	meta: { title: 'Revisão' },
	loader: () => import('../example/screens/success/Success'),
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

describe('check: diff do grafo', () => {
	it('deteta passos novos, passos alterados e transições novas/removidas', () => {
		const diff = diffGraphs(before, after);

		assert.deepEqual(diff.addedNodes.map(node => node.id), ['checkout.review']);
		assert.deepEqual(diff.removedNodes, []);
		assert.deepEqual(diff.changedNodes, [{ id: 'checkout.payment', changes: ['passou a entrypoint'] }]);
		assert.deepEqual(diff.addedEdges.map(edge => edge.id).sort(), [
			'checkout.cart:checkout->review',
			'checkout.review:confirm->payment',
		]);
		assert.deepEqual(diff.removedEdges.map(edge => edge.id), ['checkout.cart:checkout->payment']);
	});

	it('o mesmo grafo não tem diff', () => {
		assert.equal(isEmptyDiff(diffGraphs(before, toGraph(flowApp))), true);
		assert.match(diffToMarkdown(before, before), /Sem alterações à navegação/);
	});

	it('o Mermaid destaca o que é novo e desenha o que foi removido', () => {
		const mermaid = toMermaidDiff(before, after);
		const lines = mermaid.split('\n');
		const edgeLines = lines.filter(line => /-->|-\.->/.test(line));
		const removedIndex = edgeLines.findIndex(line => line.includes('checkout_cart -->|checkout| checkout_payment'));
		const addedIndex = edgeLines.findIndex(line => line.includes('checkout_review -->|confirm| checkout_payment'));

		assert.ok(lines.includes('  class checkout_review added'));
		assert.ok(lines.includes('  class checkout_payment changed'));
		assert.ok(removedIndex >= 0, 'a transição removida continua desenhada');
		assert.ok(lines.includes(`  linkStyle ${removedIndex} stroke:#cf222e,stroke-dasharray:4 3`));
		assert.ok(lines.includes(`  linkStyle ${addedIndex} stroke:#1a7f37,stroke-width:3px`));
	});

	it('o resumo em markdown lista as alterações e a validação', () => {
		const markdown = diffToMarkdown(before, after, check(changedApp).issues);

		assert.match(markdown, /\*\*Passos novos\*\*\n- `checkout.review` \(review\)/);
		assert.match(markdown, /\*\*Transições removidas\*\*\n- `checkout.cart` —checkout→ `checkout.payment`/);
		assert.match(markdown, /`checkout.payment`: passou a entrypoint/);
		assert.match(markdown, /```mermaid\ngraph LR/);
		// O branch novo não declarou samples: aviso para os testes gerados.
		assert.match(markdown, /\*\*Validação:\*\* 0 erro\(s\), 2 aviso\(s\)/);
	});
});

describe('check: snapshot e CI', () => {
	it('o snapshot é estável (ordenado) e sem payloads de exemplo', () => {
		const snapshot = toSnapshot(before);
		const ids = snapshot.edges.map(edge => edge.id);

		assert.deepEqual(ids, [...ids].sort((a, b) => a.localeCompare(b)));
		assert.ok(snapshot.edges.every(edge => !('sample' in edge)));
	});

	it('falha quando o snapshot guardado já não corresponde aos flows', () => {
		const committed = toSnapshot(before);

		assert.equal(check(flowApp, { committed }).ok, true);
		const result = check(changedApp, { committed });
		assert.equal(result.stale, true);
		assert.equal(result.ok, false);
	});

	it('--strict: avisos também falham', () => {
		assert.equal(check(changedApp).ok, true);
		assert.equal(check(changedApp, { strict: true }).ok, false);
	});

	it('o snapshot do exemplo no repo está atualizado (o mesmo que o CI verifica)', () => {
		const committed = JSON.parse(readFileSync('example/flows.graph.json', 'utf8'));
		assert.equal(check(flowApp, { committed }).stale, false);
	});

	it('a CLI passa com o exemplo (exit 0)', () => {
		const run = spawnSync(process.execPath, ['scripts/check.mjs', '--no-build'], { encoding: 'utf8' });

		assert.equal(run.status, 0, run.stdout + run.stderr);
		assert.match(run.stdout, /6 passos, 10 transições, 0 erro\(s\), 0 aviso\(s\)/);
	});
});
