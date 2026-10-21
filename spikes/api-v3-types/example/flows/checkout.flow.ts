import { branch, defineFlow, goto } from 'react-flow-app';
import { cartScreen } from '../screens/cart/cart.screen';
import { failureScreen } from '../screens/failure/failure.screen';
import { paymentScreen } from '../screens/payment/payment.screen';
import { successScreen } from '../screens/success/success.screen';

export const checkoutFlow = defineFlow({
	name: 'checkout',
	baseUrl: 'checkout',
	steps: {
		cart: { screen: cartScreen, initial: true, entrypoint: true },
		payment: { screen: paymentScreen, url: 'pay/:orderId' },
		success: { screen: successScreen, clearHistory: true },
		failure: { screen: failureScreen, ignoreHistory: true },
	},
});

checkoutFlow.transitions({
	cart: {
		checkout: branch(['payment', goto('auth', 'login')], (_, p) => (p.loggedIn ? 'payment' : goto('auth', 'login'))),
	},
	payment: {
		pay: branch(['success', 'failure'], (_, p) => (p.ok ? 'success' : 'failure')),
		cancel: 'cart',
	},
	failure: { retry: 'payment' },
	success: { finish: goto('home', 'dashboard') },
});
