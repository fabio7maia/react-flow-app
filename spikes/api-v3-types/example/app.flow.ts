import { createFlowApp } from 'react-flow-app';
import { authFlow } from './flows/auth.flow';
import { checkoutFlow } from './flows/checkout.flow';
import { homeFlow } from './flows/home.flow';

export const flowApp = createFlowApp([homeFlow, checkoutFlow, authFlow], {
	integrations: [
		event => {
			// Ponto único de integração com terceiros, tipado para todos os flows.
			if (event.type === 'action' && event.action === 'pay') {
				analytics.track('checkout_pay', { ok: event.payload.ok });
			}
		},
	],
});

declare const analytics: { track(name: string, data?: object): void };

declare module 'react-flow-app' {
	interface Register {
		app: typeof flowApp;
		meta: { title: string; funnel?: 'checkout' | 'onboarding' };
	}
}
