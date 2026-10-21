import { defineFlow, goto } from 'react-flow-app';
import { loginScreen } from '../screens/login/login.screen';

export const authFlow = defineFlow({
	name: 'auth',
	baseUrl: 'auth',
	steps: {
		login: { screen: loginScreen, initial: true, entrypoint: true },
	},
});

authFlow.transitions({
	login: { loggedIn: goto.exit(), cancel: goto.exit() },
});
