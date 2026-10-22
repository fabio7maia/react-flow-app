import { createFlowApp } from 'react-flow-app';
import { authFlow } from './flows/auth.flow';
import { checkoutFlow } from './flows/checkout.flow';
import { homeFlow } from './flows/home.flow';

export const flowApp = createFlowApp([homeFlow, checkoutFlow, authFlow], {
	integrations: [
		event => {
			// Every instance, no React (e.g. monitoring). Analytics is an adapter: see analytics.ts.
			if (event.type === 'action:unhandled') {
				console.warn(`[flows] action without a transition: ${event.flow}.${event.step} → ${event.action}`);
			}
		},
	],
});

declare module 'react-flow-app' {
	interface Register {
		app: typeof flowApp;
		meta: { title: string; funnel?: 'checkout' | 'onboarding' };
	}
}
