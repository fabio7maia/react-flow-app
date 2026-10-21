import { defineFlow, goto } from 'react-flow-app';
import { dashboardScreen } from '../screens/dashboard/dashboard.screen';

export const homeFlow = defineFlow({
	name: 'home',
	steps: {
		dashboard: { screen: dashboardScreen, initial: true },
	},
});

homeFlow.transitions({
	dashboard: { openCart: goto('checkout', 'cart') },
});
