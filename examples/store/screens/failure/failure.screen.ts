import { defineScreen } from 'react-flow-app';

export const failureScreen = defineScreen({
	name: 'failure',
	actions: ['retry'],
	meta: { title: 'Payment failed', funnel: 'checkout' },
	loader: () => import('./Failure'),
});
