import { segment } from 'react-flow-app/analytics';

/**
 * The app's analytics in one place: a page view per step (title from `meta`), flow start and exit
 * (funnels), and only the listed actions, with what may leave each payload.
 */
export const appAnalytics = () =>
	segment({
		actions: {
			checkout: payload => ({ name: 'Checkout Started', properties: { loggedIn: payload.loggedIn } }),
			pay: payload => ({ name: 'Payment Submitted', properties: { ok: payload.ok } }),
			finish: 'Order Completed',
		},
	});
