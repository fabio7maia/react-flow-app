import { defineScreen, payload } from 'react-flow-app';

export const paymentScreen = defineScreen({
	name: 'payment',
	actions: { pay: payload<{ ok: boolean }>(), cancel: null },
	meta: { title: 'Payment', funnel: 'checkout' },
	loader: () => import('./Payment'),
});
