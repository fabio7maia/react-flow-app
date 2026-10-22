import { defineScreen } from 'react-flow-app';

export const loginScreen = defineScreen({
	name: 'login',
	actions: ['loggedIn', 'cancel'],
	meta: { title: 'Log in' },
	loader: () => import('./Login'),
});
