import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import {
	createFlowApp,
	createFlowEngine,
	defineFlow,
	defineScreen,
	type FlowEvent,
	getPaths,
	toGraph,
	toMermaid,
	validateFlows,
} from 'react-flow-app';
import { flowApp } from '../example/app.flow';
import { authFlow } from '../example/flows/auth.flow';
import { checkoutFlow } from '../example/flows/checkout.flow';
import { homeFlow } from '../example/flows/home.flow';
import { cartScreen } from '../example/screens/cart/cart.screen';
import { paymentScreen } from '../example/screens/payment/payment.screen';

const record = (engine: ReturnType<typeof createFlowEngine>): string[] => {
	const events: string[] = [];
	engine.on('*', (event: FlowEvent) => {
		const detail = event.type === 'action' ? `:${event.action}` : '';
		events.push(`${event.type}${detail}@${event.flow}.${event.step}#${event.navigationId}`);
	});
	return events;
};

const at = (engine: ReturnType<typeof createFlowEngine>): string => {
	const { flow, step } = engine.getSnapshot();
	return `${flow}.${step}`;
};

describe('contrato de eventos', () => {
	it('emite action → step:leave → step:enter com o mesmo navigationId', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		const events = record(engine);

		engine.dispatch('checkout', { loggedIn: true });

		assert.deepEqual(events, [
			'action:checkout@checkout.cart#2',
			'step:leave@checkout.cart#2',
			'step:enter@checkout.payment#2',
		]);
	});

	it('deferStartEvents retém os eventos do arranque até releaseStartEvents()', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'home' }, deferStartEvents: true });
		assert.equal(at(engine), 'home.dashboard');
		const events = record(engine);
		assert.deepEqual(events, []);

		engine.releaseStartEvents();
		engine.releaseStartEvents();

		assert.deepEqual(events, ['flow:start@home.dashboard#1', 'step:enter@home.dashboard#1']);
	});

	it('emite action:unhandled para ações sem transição', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		const events = record(engine);

		engine.dispatch('refund');

		assert.deepEqual(events, ['action:unhandled@checkout.cart#2']);
		assert.equal(at(engine), 'checkout.cart');
	});

	it('uma integração com erro não parte a navegação', () => {
		const error = mock.method(console, 'error', () => undefined);
		const tracked: string[] = [];
		const app = createFlowApp([homeFlow, checkoutFlow, authFlow], {
			integrations: [
				() => {
					throw new Error('analytics em baixo');
				},
				event => tracked.push(event.type),
			],
		});
		const engine = createFlowEngine(app, { initial: { flow: 'checkout' } });

		engine.dispatch('checkout', { loggedIn: true });

		assert.equal(at(engine), 'checkout.payment');
		assert.ok(tracked.includes('step:enter'));
		assert.ok(error.mock.callCount() > 0);
		error.mock.restore();
	});
});

describe('histórico (semântica da v2)', () => {
	it('ignoreHistory: o passo não fica no histórico ao sair dele', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		engine.dispatch('checkout', { loggedIn: true });
		engine.dispatch('pay', { ok: false });
		assert.equal(at(engine), 'checkout.failure');

		engine.dispatch('retry');
		engine.back();

		assert.equal(at(engine), 'checkout.cart');
	});

	it('back a partir de um passo ignoreHistory volta ao passo anterior', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		engine.dispatch('checkout', { loggedIn: true });
		engine.dispatch('pay', { ok: false });

		engine.back();

		assert.equal(at(engine), 'checkout.payment');
	});

	it('clearHistory: back sem histórico emite back:empty e não navega', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		engine.dispatch('checkout', { loggedIn: true });
		engine.dispatch('pay', { ok: true });
		const events = record(engine);

		engine.back();

		assert.equal(at(engine), 'checkout.success');
		assert.deepEqual(events, ['back:empty@checkout.success#4']);
	});

	it('sem allowCyclicHistory, voltar a um passo já visitado corta o ciclo', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		for (let i = 0; i < 5; i++) {
			engine.dispatch('checkout', { loggedIn: true });
			engine.dispatch('cancel');
		}

		assert.deepEqual(engine.getSnapshot().history, []);
	});

	it('goto.exit() volta ao passo que abriu o flow', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		const events = record(engine);

		engine.dispatch('checkout', { loggedIn: false });
		assert.equal(at(engine), 'auth.login');

		engine.dispatch('loggedIn');
		assert.equal(at(engine), 'checkout.cart');
		assert.deepEqual(engine.getSnapshot().callers, []);
		assert.ok(events.includes('flow:exit@auth.login#3'));
	});

	it('back atravessa flows e limpa o caller', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'home' } });
		engine.dispatch('openCart');
		assert.equal(at(engine), 'checkout.cart');

		engine.back();

		assert.equal(at(engine), 'home.dashboard');
		assert.deepEqual(engine.getSnapshot().callers, []);
	});

	it('instâncias independentes (sem singleton)', () => {
		const a = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		const b = createFlowEngine(flowApp, { initial: { flow: 'home' } });
		a.dispatch('checkout', { loggedIn: true });

		assert.equal(at(a), 'checkout.payment');
		assert.equal(at(b), 'home.dashboard');
	});
});

describe('diagrama e validação', () => {
	it('extrai o grafo de flows declarados em ficheiros separados, sem executar resolvers', () => {
		const graph = toGraph(flowApp);

		assert.equal(graph.nodes.length, 6);
		assert.deepEqual(
			graph.edges.map(edge => `${edge.from} -${edge.action}/${edge.kind}-> ${edge.to}`),
			[
				'home.dashboard -openCart/cross-flow-> checkout.cart',
				'checkout.cart -checkout/branch-> checkout.payment',
				'checkout.cart -checkout/cross-flow-> auth.login',
				'checkout.payment -pay/branch-> checkout.success',
				'checkout.payment -pay/branch-> checkout.failure',
				'checkout.payment -cancel/direct-> checkout.cart',
				'checkout.success -finish/cross-flow-> home.dashboard',
				'checkout.failure -retry/direct-> checkout.payment',
				'auth.login -loggedIn/exit-> checkout.cart',
				'auth.login -cancel/exit-> checkout.cart',
			]
		);
	});

	it('gera Mermaid estável (snapshot do diagrama no PR)', () => {
		assert.equal(
			toMermaid(toGraph(flowApp)),
			[
				'graph LR',
				'  subgraph home',
				'    home_dashboard((dashboard))',
				'  end',
				'  subgraph checkout',
				'    checkout_cart((cart))',
				'    checkout_payment[payment]',
				'    checkout_success[success]',
				'    checkout_failure[failure]',
				'  end',
				'  subgraph auth',
				'    auth_login((login))',
				'  end',
				'  home_dashboard -.->|openCart| checkout_cart',
				'  checkout_cart -->|checkout| checkout_payment',
				'  checkout_cart -.->|checkout| auth_login',
				'  checkout_payment -->|pay| checkout_success',
				'  checkout_payment -->|pay| checkout_failure',
				'  checkout_payment -->|cancel| checkout_cart',
				'  checkout_success -.->|finish| home_dashboard',
				'  checkout_failure -->|retry| checkout_payment',
				'  auth_login -.->|loggedIn ↩| checkout_cart',
				'  auth_login -.->|cancel ↩| checkout_cart',
			].join('\n')
		);
	});

	it('a app de exemplo é válida', () => {
		assert.deepEqual(validateFlows(flowApp), []);
	});

	it('deteta ações sem transição, passos inalcançáveis e flows sem passo inicial', () => {
		const broken = defineFlow({
			name: 'broken',
			steps: { cart: { screen: cartScreen }, payment: { screen: paymentScreen } },
		});
		broken.transitions({ payment: { cancel: 'cart' } });

		const issues = validateFlows(createFlowApp([broken]));

		assert.deepEqual(
			issues.map(issue => `${issue.code}@${issue.where}`),
			['no-initial-step@broken', 'unhandled-action@broken.cart', 'unhandled-action@broken.payment', 'unreachable-step@broken.payment']
		);
	});
});

describe('overlays e retoma de flows', () => {
	const helpScreen = defineScreen({
		name: 'help',
		actions: ['backToCart', 'close'],
		meta: { title: 'Ajuda' },
		loader: () => import('../example/screens/success/Success'),
	});

	it('um overlay e o nome de um passo não podem coincidir', () => {
		assert.throws(() =>
			defineFlow({ name: 'clash', steps: { help: { screen: cartScreen } }, overlays: { help: helpScreen } })
		);
	});

	it('overlays aparecem no grafo e no Mermaid, e entram na validação', () => {
		const flow = defineFlow({
			name: 'shop',
			steps: { cart: { screen: cartScreen, initial: true }, payment: { screen: paymentScreen } },
			overlays: { help: helpScreen },
		});
		flow.transitions({ cart: { checkout: 'payment' }, payment: { pay: 'cart', cancel: 'cart' }, help: { backToCart: 'cart' } });
		const app = createFlowApp([flow]);

		assert.ok(toMermaid(toGraph(app)).includes('shop__help{{@help}}'));
		assert.ok(toMermaid(toGraph(app)).includes('shop__help -->|backToCart| shop_cart'));
		assert.deepEqual(
			validateFlows(app).map(issue => `${issue.code}@${issue.where}`),
			['unhandled-action@shop.@help']
		);
	});

	it('start(flow) sem passo retoma o flow no último passo onde esteve', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		engine.dispatch('checkout', { loggedIn: true });
		engine.start('home');
		engine.start('checkout');

		assert.equal(at(engine), 'checkout.payment');
	});
});

describe('testes gerados a partir do grafo', () => {
	// Os branches escolhem o destino em runtime: cada aresta de branch precisa de um payload de exemplo.
	const samples: Record<string, unknown> = {
		'checkout.cart:checkout->payment': { loggedIn: true },
		'checkout.cart:checkout->auth.login': { loggedIn: false },
		'checkout.payment:pay->success': { ok: true },
		'checkout.payment:pay->failure': { ok: false },
	};

	const paths = getPaths(flowApp, 'home.dashboard');

	it('gera um caminho para cada passo alcançável', () => {
		assert.deepEqual(paths.map(path => path.target).sort(), [
			'auth.login',
			'checkout.cart',
			'checkout.failure',
			'checkout.payment',
			'checkout.success',
		]);
	});

	for (const path of paths) {
		it(`chega a ${path.target} por ${path.steps.map(step => step.action).join(' → ')}`, () => {
			const engine = createFlowEngine(flowApp, { initial: { flow: 'home' } });
			for (const step of path.steps) {
				engine.dispatch(step.action, samples[step.key]);
			}
			assert.equal(at(engine), path.target);
		});
	}

	it('reporta as transições que nenhum teste exercitou', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'home' } });
		for (const path of paths) {
			engine.start('home');
			for (const step of path.steps) {
				engine.dispatch(step.action, samples[step.key]);
			}
		}

		const { ratio, missing } = engine.coverage();

		assert.deepEqual(missing, [
			'checkout.payment:cancel->cart',
			'checkout.success:finish->home.dashboard',
			'checkout.failure:retry->payment',
			'auth.login:loggedIn->exit',
			'auth.login:cancel->exit',
		]);
		assert.equal(ratio, 0.5);
	});
});
