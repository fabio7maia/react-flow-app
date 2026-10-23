import { defineFlow, defineScreen, effect, payload } from 'react-flow-app';
import { useFlowEvents } from 'react-flow-app/react';

interface Draft {
	name: string;
	email: string;
}

const detailsScreen = defineScreen({
	name: 'details',
	actions: { saveDraft: payload<Draft>(), next: null },
	meta: { title: 'Your details' },
	loader: () => import('./support/Placeholder'),
});

const summaryScreen = defineScreen({
	name: 'summary',
	actions: { submit: null },
	meta: { title: 'Summary' },
	loader: () => import('./support/Placeholder'),
});

export const signupFlow = defineFlow({
	name: 'signup',
	steps: {
		details: { screen: detailsScreen, initial: true },
		summary: { screen: summaryScreen },
	},
});

signupFlow.transitions({
	details: {
		// An effect runs without navigating: the draft is saved as the user types.
		saveDraft: effect((_, draft) => localStorage.setItem('signup-draft', JSON.stringify(draft))),
		next: 'summary',
	},
	summary: { submit: effect(() => localStorage.removeItem('signup-draft')) },
});

/** Drop the draft when the user leaves the flow without finishing it. */
export function DiscardDraftOnExit() {
	useFlowEvents('flow:exit', event => {
		// `signup` is not in the example app's Register, hence the widening; in your app it is a plain comparison.
		if ((event.flow as string) === 'signup') localStorage.removeItem('signup-draft');
	});
	return null;
}
