import { useFlow } from 'react-flow-app';
import { failureScreen } from './failure.screen';

export default function Failure() {
	const { dispatch } = useFlow(failureScreen);
	return (
		<>
			<h1>Pagamento falhou</h1>
			<button onClick={() => dispatch('retry')}>Tentar novamente</button>
		</>
	);
}
