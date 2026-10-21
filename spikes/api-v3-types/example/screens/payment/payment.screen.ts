import { defineScreen, payload } from 'react-flow-app';

export const paymentScreen = defineScreen({
	name: 'payment',
	actions: { pay: payload<{ ok: boolean }>(), cancel: null },
	meta: { title: 'Pagamento', funnel: 'checkout' },
	loader: () => import('./Payment'),
});
