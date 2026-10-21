import { defineScreen } from 'react-flow-app';

export const successScreen = defineScreen({
	name: 'success',
	actions: ['finish'],
	meta: { title: 'Compra concluída', funnel: 'checkout' },
	loader: () => import('./Success'),
});
