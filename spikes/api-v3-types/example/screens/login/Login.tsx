import { useFlow } from 'react-flow-app';
import { loginScreen } from './login.screen';

export default function Login() {
	const { dispatch } = useFlow(loginScreen);
	return (
		<>
			<h1>Login</h1>
			<button onClick={() => dispatch('loggedIn')}>Entrar</button>
			<button onClick={() => dispatch('cancel')}>Cancelar</button>
		</>
	);
}
