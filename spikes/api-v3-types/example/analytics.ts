import { segment } from 'react-flow-app';

/**
 * Analytics da app num só sítio: page view por passo (título do `meta`), início/saída de
 * flows (funis) e só as ações listadas, com o que pode sair de cada payload.
 */
export const appAnalytics = () =>
	segment({
		actions: {
			checkout: payload => ({ name: 'Checkout Started', properties: { loggedIn: payload.loggedIn } }),
			pay: payload => ({ name: 'Payment Submitted', properties: { ok: payload.ok } }),
			finish: 'Order Completed',
		},
	});
