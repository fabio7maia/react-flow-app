import { useFlow } from 'react-flow-app/react';
import { loginScreen } from './login.screen';

export default function Login() {
	const { dispatch } = useFlow(loginScreen);
	return (
		<>
			<h1>Log in</h1>
			<button onClick={() => dispatch('loggedIn')}>Log in</button>
			<button onClick={() => dispatch('cancel')}>Cancel</button>
		</>
	);
}
