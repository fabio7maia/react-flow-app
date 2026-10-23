import { branch, defineFlow, defineScreen, goto, payload } from 'react-flow-app';

const reviewScreen = defineScreen({
	name: 'review',
	actions: { confirm: payload<{ loggedIn: boolean }>() },
	meta: { title: 'Review' },
	loader: () => import('./support/Placeholder'),
});

const doneScreen = defineScreen({
	name: 'done',
	actions: { close: null },
	meta: { title: 'Done' },
	loader: () => import('./support/Placeholder'),
});

export const bookingFlow = defineFlow({
	name: 'booking',
	steps: {
		review: { screen: reviewScreen, initial: true },
		done: { screen: doneScreen, clearHistory: true },
	},
});

bookingFlow.transitions({
	review: {
		// Anonymous users go through the auth flow; its `goto.exit()` brings them back to `review`.
		confirm: branch(['done', goto('auth', 'login')], (_, p) => (p.loggedIn ? 'done' : goto('auth', 'login')), {
			samples: { done: { loggedIn: true }, 'auth.login': { loggedIn: false } },
		}),
	},
	done: { close: goto('home', 'dashboard') },
});
