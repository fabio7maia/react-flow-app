/**
 * Testes de tipos: correm com `tsc --noEmit`. Cada `@ts-expect-error` falha a
 * compilação se a linha seguinte deixar de dar erro (tipagem demasiado permissiva).
 */
import {
	branch,
	createFlowEngine,
	defineFlow,
	defineScreen,
	effect,
	goto,
	payload,
	type RegisteredEvent,
	type RegisteredFlowName,
	type ScreenActions,
	useFlow,
	useFlowEvents,
} from 'react-flow-app';
import { flowApp } from '../example/app.flow';
import { checkoutFlow } from '../example/flows/checkout.flow';
import { cartScreen } from '../example/screens/cart/cart.screen';
import { paymentScreen } from '../example/screens/payment/payment.screen';
import { successScreen } from '../example/screens/success/success.screen';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const expectType = <T extends true>(): T => true as T;

// ─── Ecrãs: ações e payloads inferidos sem `as const` ─────────────────────────

expectType<Equal<ScreenActions<typeof paymentScreen>, { pay: { ok: boolean }; cancel: undefined }>>();
expectType<Equal<ScreenActions<typeof successScreen>, { finish: undefined }>>();

defineScreen({
	name: 'x',
	actions: ['a'],
	// @ts-expect-error meta tipada pelo Register: `title` é obrigatório
	meta: { funnel: 'checkout' },
	loader: () => import('../example/screens/success/Success'),
});

defineScreen({
	name: 'x',
	actions: ['a'],
	// @ts-expect-error funnel só aceita 'checkout' | 'onboarding'
	meta: { title: 'X', funnel: 'other' },
	loader: () => import('../example/screens/success/Success'),
});

// ─── dispatch tipado pelo ecrã ────────────────────────────────────────────────

function PaymentProbe() {
	const { dispatch } = useFlow(paymentScreen);
	dispatch('pay', { ok: true });
	dispatch('cancel');
	// @ts-expect-error ação inexistente no ecrã
	dispatch('finish');
	// @ts-expect-error payload obrigatório em `pay`
	dispatch('pay');
	// @ts-expect-error payload com forma errada
	dispatch('pay', { ok: 'yes' });
	return null;
}
void PaymentProbe;

// ─── Transições ───────────────────────────────────────────────────────────────

checkoutFlow.transitions({
	// @ts-expect-error passo local inexistente
	failure: { retry: 'paymnt' },
});

checkoutFlow.transitions({
	// @ts-expect-error ação que o ecrã do passo não declara
	failure: { cancel: 'cart' },
});

checkoutFlow.transitions({
	// @ts-expect-error passo que não existe no flow
	shipping: {},
});

checkoutFlow.transitions({
	// @ts-expect-error flow inexistente no Register
	failure: { retry: goto('shop', 'cart') },
});

checkoutFlow.transitions({
	// @ts-expect-error passo inexistente no flow `auth`
	failure: { retry: goto('auth', 'cart') },
});

checkoutFlow.transitions({
	payment: {
		// payload inferido da ação `pay` → `p.ok` é boolean
		pay: branch(['success', 'failure'], (_, p) => {
			expectType<Equal<typeof p, { ok: boolean }>>();
			return p.ok ? 'success' : 'failure';
		}),
	},
});

checkoutFlow.transitions({
	payment: {
		// @ts-expect-error o resolver devolve um alvo que não está nos targets
		pay: branch(['success'], (_, p) => (p.ok ? 'success' : 'failure')),
	},
});

checkoutFlow.transitions({
	payment: {
		// @ts-expect-error um target do branch não é passo do flow
		pay: branch(['success', 'refund'], () => 'success'),
	},
});

// Um ecrã pode ser usado em dois passos do mesmo flow com nomes diferentes.
const reviewFlow = defineFlow({
	name: 'review',
	steps: {
		firstCart: { screen: cartScreen, initial: true },
		secondCart: { screen: cartScreen },
	},
});
reviewFlow.transitions({ firstCart: { checkout: 'secondCart' }, secondCart: { checkout: 'firstCart' } });

// ─── Overlays e retoma ────────────────────────────────────────────────────────

const helpScreen = defineScreen({
	name: 'help',
	actions: ['backToCart', 'close'],
	meta: { title: 'Ajuda' },
	loader: () => import('../example/screens/success/Success'),
});
const withHelp = defineFlow({
	name: 'withHelp',
	steps: { cart: { screen: cartScreen, initial: true }, payment: { screen: paymentScreen } },
	overlays: { help: helpScreen },
});
withHelp.transitions({ help: { backToCart: 'cart', close: effect(() => undefined) } });
withHelp.transitions({
	// @ts-expect-error overlay que o flow não declara
	modal: {},
});
withHelp.transitions({
	// @ts-expect-error um overlay não é destino: só passos do flow
	help: { backToCart: 'help' },
});
withHelp.transitions({
	// @ts-expect-error ação que o ecrã do overlay não declara
	help: { open: 'cart' },
});

checkoutFlow.transitions({ failure: { retry: goto('auth') } }); // sem passo: retoma o flow
checkoutFlow.transitions({
	// @ts-expect-error flow inexistente, mesmo sem passo
	failure: { retry: goto('shop') },
});

// ─── Registo, eventos e engine ────────────────────────────────────────────────

expectType<Equal<RegisteredFlowName, 'home' | 'checkout' | 'auth'>>();

type PayEvent = Extract<RegisteredEvent, { type: 'action'; action: 'pay' }>;
expectType<Equal<PayEvent['payload'], { ok: boolean }>>();
expectType<Equal<PayEvent['flow'], 'home' | 'checkout' | 'auth'>>();

function EventsProbe() {
	useFlowEvents('action', event => {
		if (event.action === 'checkout') {
			expectType<Equal<typeof event.payload, { loggedIn: boolean }>>();
		}
		// @ts-expect-error ação que nenhum ecrã declara
		if (event.action === 'refund') return;
	});
	useFlowEvents('step:enter', event => {
		expectType<Equal<typeof event.meta, { title: string; funnel?: 'checkout' | 'onboarding' } | undefined>>();
	});
	return null;
}
void EventsProbe;

const engine = createFlowEngine(flowApp);
engine.start('checkout', 'payment');
// @ts-expect-error passo que não pertence ao flow `checkout`
engine.start('checkout', 'login');
// @ts-expect-error flow inexistente
engine.start('shop');

void payload;
