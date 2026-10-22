/**
 * Type tests: they run with `tsc` (yarn typecheck). Each `@ts-expect-error` fails the build if the
 * next line stops being an error (typing too permissive).
 */
/* eslint-disable @typescript-eslint/no-unused-vars -- values here exist only for the type checker */
import {
	branch,
	createFlowEngine,
	defineFlow,
	defineScreen,
	effect,
	goto,
	payload,
	type ParamsOf,
	type RegisteredEvent,
	type RegisteredFlowName,
	type ScreenActions,
} from 'react-flow-app';
import { ga4, segment } from 'react-flow-app/analytics';
import { useFlow, useFlowEvents, useStepParams } from 'react-flow-app/react';
import { flowApp } from '../examples/store/app.flow';
import { checkoutFlow } from '../examples/store/flows/checkout.flow';
import { cartScreen } from '../examples/store/screens/cart/cart.screen';
import { paymentScreen } from '../examples/store/screens/payment/payment.screen';
import { successScreen } from '../examples/store/screens/success/success.screen';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const expectType = <T extends true>(): T => true as T;

// ─── Screens: actions and payloads inferred without `as const` ────────────────

expectType<Equal<ScreenActions<typeof paymentScreen>, { pay: { ok: boolean }; cancel: undefined }>>();
expectType<Equal<ScreenActions<typeof successScreen>, { finish: undefined }>>();

defineScreen({
	name: 'x',
	actions: ['a'],
	// @ts-expect-error meta typed by Register: `title` is required
	meta: { funnel: 'checkout' },
	loader: () => import('../examples/store/screens/success/Success'),
});

defineScreen({
	name: 'x',
	actions: ['a'],
	// @ts-expect-error funnel only accepts 'checkout' | 'onboarding'
	meta: { title: 'X', funnel: 'other' },
	loader: () => import('../examples/store/screens/success/Success'),
});

// ─── dispatch typed by the screen ─────────────────────────────────────────────

function PaymentProbe() {
	const { dispatch } = useFlow(paymentScreen);
	dispatch('pay', { ok: true });
	dispatch('cancel');
	// @ts-expect-error action the screen does not have
	dispatch('finish');
	// @ts-expect-error `pay` requires a payload
	dispatch('pay');
	// @ts-expect-error payload with the wrong shape
	dispatch('pay', { ok: 'yes' });
	return null;
}
void PaymentProbe;

// ─── Transitions ──────────────────────────────────────────────────────────────

checkoutFlow.transitions({
	// @ts-expect-error unknown local step
	failure: { retry: 'paymnt' },
});

checkoutFlow.transitions({
	// @ts-expect-error action the step's screen does not declare
	failure: { cancel: 'cart' },
});

checkoutFlow.transitions({
	// @ts-expect-error step that does not exist in the flow
	shipping: {},
});

checkoutFlow.transitions({
	// @ts-expect-error flow not in Register
	failure: { retry: goto('shop', 'cart') },
});

checkoutFlow.transitions({
	// @ts-expect-error step that does not exist in flow `auth`
	failure: { retry: goto('auth', 'cart') },
});

checkoutFlow.transitions({
	payment: {
		// payload inferred from action `pay` → `p.ok` is boolean
		pay: branch(['success', 'failure'], (_, p) => {
			expectType<Equal<typeof p, { ok: boolean }>>();
			return p.ok ? 'success' : 'failure';
		}),
	},
});

checkoutFlow.transitions({
	payment: {
		// @ts-expect-error the resolver returns a target that is not in targets
		pay: branch(['success'], (_, p) => (p.ok ? 'success' : 'failure')),
	},
});

checkoutFlow.transitions({
	payment: {
		// @ts-expect-error a branch target is not a step of the flow
		pay: branch(['success', 'refund'], () => 'success'),
	},
});

// A screen can be used by two steps of the same flow under different names.
const reviewFlow = defineFlow({
	name: 'review',
	steps: {
		firstCart: { screen: cartScreen, initial: true },
		secondCart: { screen: cartScreen },
	},
});
reviewFlow.transitions({ firstCart: { checkout: 'secondCart' }, secondCart: { checkout: 'firstCart' } });

// ─── Overlays and resume ──────────────────────────────────────────────────────

const helpScreen = defineScreen({
	name: 'help',
	actions: ['backToCart', 'close'],
	meta: { title: 'Help' },
	loader: () => import('../examples/store/screens/success/Success'),
});
const withHelp = defineFlow({
	name: 'withHelp',
	steps: { cart: { screen: cartScreen, initial: true }, payment: { screen: paymentScreen } },
	overlays: { help: helpScreen },
});
withHelp.transitions({ help: { backToCart: 'cart', close: effect(() => undefined) } });
withHelp.transitions({
	// @ts-expect-error overlay the flow does not declare
	modal: {},
});
withHelp.transitions({
	// @ts-expect-error an overlay is not a target: only steps of the flow
	help: { backToCart: 'help' },
});
withHelp.transitions({
	// @ts-expect-error action the overlay's screen does not declare
	help: { open: 'cart' },
});

checkoutFlow.transitions({ failure: { retry: goto('auth') } }); // without a step: resumes the flow
checkoutFlow.transitions({
	// @ts-expect-error unknown flow, even without a step
	failure: { retry: goto('shop') },
});

// ─── Sample payloads in branches ──────────────────────────────────────────────

checkoutFlow.transitions({
	payment: {
		pay: branch(['success', 'failure'], (_, p) => (p.ok ? 'success' : 'failure'), {
			samples: { success: { ok: true }, failure: { ok: false } },
		}),
	},
});
checkoutFlow.transitions({
	cart: {
		checkout: branch(['payment', goto('auth', 'login')], (_, p) => (p.loggedIn ? 'payment' : goto('auth', 'login')), {
			samples: { 'auth.login': { loggedIn: false } },
		}),
	},
});
checkoutFlow.transitions({
	payment: {
		pay: branch(['success', 'failure'], (_, p) => (p.ok ? 'success' : 'failure'), {
			// @ts-expect-error key that is not one of the branch targets
			samples: { refund: { ok: true } },
		}),
	},
});
checkoutFlow.transitions({
	payment: {
		pay: branch(['success', 'failure'], (_, p) => (p.ok ? 'success' : 'failure'), {
			// @ts-expect-error the sample must have the shape of the action payload
			samples: { success: { ok: 'yes' } },
		}),
	},
});

// ─── Typed URL params ─────────────────────────────────────────────────────────

expectType<Equal<ParamsOf<'pay/:orderId'>, { orderId: string }>>();
expectType<Equal<ParamsOf<'orders/:id/lines/:line'>, { id: string; line: string }>>();
expectType<Equal<ParamsOf<'cart'>, Record<string, never>>>();

function ParamsProbe() {
	const params = useStepParams('checkout', 'payment');
	expectType<Equal<typeof params, { orderId: string }>>();
	return null;
}
void ParamsProbe;

// ─── Register, events and engine ──────────────────────────────────────────────

expectType<Equal<RegisteredFlowName, 'home' | 'checkout' | 'auth'>>();

type PayEvent = Extract<RegisteredEvent, { type: 'action'; action: 'pay' }>;
expectType<Equal<PayEvent['payload'], { ok: boolean }>>();
expectType<Equal<PayEvent['flow'], 'home' | 'checkout' | 'auth'>>();

function EventsProbe() {
	useFlowEvents('action', event => {
		if (event.action === 'checkout') {
			expectType<Equal<typeof event.payload, { loggedIn: boolean }>>();
		}
		// @ts-expect-error action no screen declares
		if (event.action === 'refund') return;
	});
	useFlowEvents('step:enter', event => {
		expectType<Equal<typeof event.meta, { title: string; funnel?: 'checkout' | 'onboarding' } | undefined>>();
	});
	return null;
}
void EventsProbe;

// ─── Analytics: actions and payloads typed by Register ────────────────────────

segment({
	actions: {
		checkout: payload => {
			expectType<Equal<typeof payload, { loggedIn: boolean }>>();
			return { name: 'Checkout Started', properties: { loggedIn: payload.loggedIn } };
		},
		pay: payload => (payload.ok ? false : { name: 'Payment Failed' }),
		finish: 'Order Completed',
		// @ts-expect-error action no screen declares
		refund: 'Refund',
	},
});
ga4({
	page: event => {
		expectType<Equal<typeof event.meta, { title: string; funnel?: 'checkout' | 'onboarding' } | undefined>>();
		return { title: event.meta?.title };
	},
	// @ts-expect-error the mapping must return { name } (or false)
	actions: { pay: () => ({ event: 'pay' }) },
});

const engine = createFlowEngine(flowApp);
engine.start('checkout', 'payment');
engine.start('checkout', 'payment', { params: { orderId: '42' } });
// @ts-expect-error the payment step has the orderId param, not id
engine.start('checkout', 'payment', { params: { id: '42' } });
// @ts-expect-error the cart step has no params
engine.start('checkout', 'cart', { params: { orderId: '42' } });
engine.urlOf({ flow: 'checkout', step: 'payment' }, { orderId: '42' });
// @ts-expect-error param with the wrong name
engine.urlOf({ flow: 'checkout', step: 'payment' }, { order: '42' });
// @ts-expect-error step that does not belong to flow `checkout`
engine.start('checkout', 'login');
// @ts-expect-error unknown flow
engine.start('shop');

void payload;
