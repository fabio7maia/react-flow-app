import { branch, createFlowApp, defineFlow, defineScreen, goto } from 'react-flow-app';
import { authFlow } from '../example/flows/auth.flow';
import { homeFlow } from '../example/flows/home.flow';
import { cartScreen } from '../example/screens/cart/cart.screen';
import { failureScreen } from '../example/screens/failure/failure.screen';
import { paymentScreen } from '../example/screens/payment/payment.screen';
import { successScreen } from '../example/screens/success/success.screen';

/**
 * Um "PR" de exemplo para o separador de revisão: um passo de revisão entre o carrinho e o
 * pagamento, e o pagamento passa a aceitar deep links. É o mesmo cenário do check.test.ts.
 */
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
	cart: {
		checkout: branch(['review', goto('auth', 'login')], (_, p) => (p.loggedIn ? 'review' : goto('auth', 'login')), {
			samples: { review: { loggedIn: true }, 'auth.login': { loggedIn: false } },
		}),
	},
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

export const reviewedApp = createFlowApp([homeFlow, checkoutWithReview, authFlow]);
