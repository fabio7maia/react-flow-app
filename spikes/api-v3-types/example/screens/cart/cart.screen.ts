import { defineScreen, payload } from 'react-flow-app';

export const cartScreen = defineScreen({
	name: 'cart',
	actions: { checkout: payload<{ loggedIn: boolean }>() },
	meta: { title: 'Carrinho', funnel: 'checkout' },
	loader: () => import('./Cart'),
});
