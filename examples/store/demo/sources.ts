// Source code of the example, embedded in the demo build (esbuild resolves `?raw` to text).
import appFlow from '../app.flow.ts?raw';
import analytics from '../analytics.ts?raw';
import authFlow from '../flows/auth.flow.ts?raw';
import checkoutFlow from '../flows/checkout.flow.ts?raw';
import homeFlow from '../flows/home.flow.ts?raw';
import Cart from '../screens/cart/Cart.tsx?raw';
import cartScreen from '../screens/cart/cart.screen.ts?raw';
import Dashboard from '../screens/dashboard/Dashboard.tsx?raw';
import dashboardScreen from '../screens/dashboard/dashboard.screen.ts?raw';
import Failure from '../screens/failure/Failure.tsx?raw';
import failureScreen from '../screens/failure/failure.screen.ts?raw';
import Login from '../screens/login/Login.tsx?raw';
import loginScreen from '../screens/login/login.screen.ts?raw';
import Payment from '../screens/payment/Payment.tsx?raw';
import paymentScreen from '../screens/payment/payment.screen.ts?raw';
import Success from '../screens/success/Success.tsx?raw';
import successScreen from '../screens/success/success.screen.ts?raw';

export type SourceFile = { path: string; code: string };

const screens: Record<string, [SourceFile, SourceFile]> = {
	dashboard: [
		{ path: 'screens/dashboard/dashboard.screen.ts', code: dashboardScreen },
		{ path: 'screens/dashboard/Dashboard.tsx', code: Dashboard },
	],
	cart: [
		{ path: 'screens/cart/cart.screen.ts', code: cartScreen },
		{ path: 'screens/cart/Cart.tsx', code: Cart },
	],
	payment: [
		{ path: 'screens/payment/payment.screen.ts', code: paymentScreen },
		{ path: 'screens/payment/Payment.tsx', code: Payment },
	],
	success: [
		{ path: 'screens/success/success.screen.ts', code: successScreen },
		{ path: 'screens/success/Success.tsx', code: Success },
	],
	failure: [
		{ path: 'screens/failure/failure.screen.ts', code: failureScreen },
		{ path: 'screens/failure/Failure.tsx', code: Failure },
	],
	login: [
		{ path: 'screens/login/login.screen.ts', code: loginScreen },
		{ path: 'screens/login/Login.tsx', code: Login },
	],
};

const flows: Record<string, SourceFile> = {
	home: { path: 'flows/home.flow.ts', code: homeFlow },
	checkout: { path: 'flows/checkout.flow.ts', code: checkoutFlow },
	auth: { path: 'flows/auth.flow.ts', code: authFlow },
};

/** The files that define the current step: the screen, the component, the flow and the app composition. */
export function sourcesFor(flow: string, screen: string): SourceFile[] {
	return [
		...(screens[screen] ?? []),
		...(flows[flow] ? [flows[flow]] : []),
		{ path: 'app.flow.ts', code: appFlow },
		{ path: 'analytics.ts', code: analytics },
	];
}
