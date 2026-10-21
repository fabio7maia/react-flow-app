import { createFlowApp } from 'react-flow-app';
import { authFlow } from './flows/auth.flow';
import { checkoutFlow } from './flows/checkout.flow';
import { homeFlow } from './flows/home.flow';

export const flowApp = createFlowApp([homeFlow, checkoutFlow, authFlow], {
	integrations: [
		event => {
			// Todas as instâncias, sem React (ex.: monitorização). O analytics é um adaptador: ver analytics.ts.
			if (event.type === 'action:unhandled') {
				console.warn(`[flows] ação sem transição: ${event.flow}.${event.step} → ${event.action}`);
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
