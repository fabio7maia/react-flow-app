import { defineScreen } from 'react-flow-app';

export const successScreen = defineScreen({
	name: 'success',
	actions: ['finish'],
	meta: { title: 'Order complete', funnel: 'checkout' },
	loader: () => import('./Success'),
});
