import { useFlow } from 'react-flow-app';
import { successScreen } from './success.screen';

export default function Success() {
	const { dispatch } = useFlow(successScreen);
	return (
		<>
			<h1>Compra concluída</h1>
			<button onClick={() => dispatch('finish')}>Voltar ao início</button>
		</>
	);
}
