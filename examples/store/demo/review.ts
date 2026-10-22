import { branch, createFlowApp, defineFlow, defineScreen, goto } from 'react-flow-app';
import { authFlow } from '../flows/auth.flow';
import { homeFlow } from '../flows/home.flow';
import { cartScreen } from '../screens/cart/cart.screen';
import { failureScreen } from '../screens/failure/failure.screen';
import { paymentScreen } from '../screens/payment/payment.screen';
import { successScreen } from '../screens/success/success.screen';

/**
 * An example "PR" for the review tab: a review step between the cart and the payment, and the
 * payment step becomes an entrypoint. The same scenario as test/testing.test.ts.
 */
const reviewScreen = defineScreen({
	name: 'review',
	actions: ['confirm'],
	meta: { title: 'Review' },
	loader: () => import('../screens/success/Success'),
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
