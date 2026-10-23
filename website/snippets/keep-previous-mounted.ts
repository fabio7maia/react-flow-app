import { defineFlow, defineScreen, payload } from 'react-flow-app';

const productsScreen = defineScreen({
	name: 'products',
	actions: { open: payload<{ id: string }>() },
	meta: { title: 'Products' },
	loader: () => import('./support/Placeholder'),
});

const productScreen = defineScreen({
	name: 'product',
	actions: { close: null },
	meta: { title: 'Product' },
	loader: () => import('./support/Placeholder'),
});

export const catalogFlow = defineFlow({
	name: 'catalog',
	baseUrl: 'catalog',
	steps: {
		products: { screen: productsScreen, initial: true },
		// The list stays mounted (hidden) behind the detail: filters, scroll and fetched pages survive `back`.
		product: { screen: productScreen, url: ':id', keepPreviousMounted: true },
	},
});

catalogFlow.transitions({
	products: { open: 'product' },
	product: { close: 'products' },
});
