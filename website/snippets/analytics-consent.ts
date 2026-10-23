import { ga4, segment } from 'react-flow-app/analytics';

const consent = { analytics: false };

// Nothing is sent until the user accepts. `enabled` is read on every event, so a later
// opt-in starts the stream without recreating the adapter.
export const analytics = [
	segment({
		actions: {
			checkout: payload => ({ name: 'Checkout Started', properties: { loggedIn: payload.loggedIn } }),
			finish: 'Order Completed',
		},
		enabled: () => consent.analytics,
	}),
	ga4({ enabled: () => consent.analytics }),
];

export function acceptAnalytics() {
	consent.analytics = true;
}
