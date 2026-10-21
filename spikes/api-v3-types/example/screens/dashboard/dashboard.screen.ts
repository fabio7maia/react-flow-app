import { defineScreen } from 'react-flow-app';

export const dashboardScreen = defineScreen({
	name: 'dashboard',
	actions: ['openCart'],
	meta: { title: 'Início' },
	loader: () => import('./Dashboard'),
});
