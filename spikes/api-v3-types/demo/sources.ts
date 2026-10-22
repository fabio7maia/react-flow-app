// Código fonte do exemplo, embebido no build da demo (o esbuild resolve `?raw` para texto).
import appFlow from '../example/app.flow.ts?raw';
import analytics from '../example/analytics.ts?raw';
import authFlow from '../example/flows/auth.flow.ts?raw';
import checkoutFlow from '../example/flows/checkout.flow.ts?raw';
import homeFlow from '../example/flows/home.flow.ts?raw';
import Cart from '../example/screens/cart/Cart.tsx?raw';
import cartScreen from '../example/screens/cart/cart.screen.ts?raw';
import Dashboard from '../example/screens/dashboard/Dashboard.tsx?raw';
import dashboardScreen from '../example/screens/dashboard/dashboard.screen.ts?raw';
import Failure from '../example/screens/failure/Failure.tsx?raw';
import failureScreen from '../example/screens/failure/failure.screen.ts?raw';
import Login from '../example/screens/login/Login.tsx?raw';
import loginScreen from '../example/screens/login/login.screen.ts?raw';
import Payment from '../example/screens/payment/Payment.tsx?raw';
import paymentScreen from '../example/screens/payment/payment.screen.ts?raw';
import Success from '../example/screens/success/Success.tsx?raw';
import successScreen from '../example/screens/success/success.screen.ts?raw';

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

/** Os ficheiros que definem o passo atual: o ecrã, o componente, o flow e a composição da app. */
export function sourcesFor(flow: string, screen: string): SourceFile[] {
	return [
		...(screens[screen] ?? []),
		...(flows[flow] ? [flows[flow]] : []),
		{ path: 'app.flow.ts', code: appFlow },
		{ path: 'analytics.ts', code: analytics },
	];
}
