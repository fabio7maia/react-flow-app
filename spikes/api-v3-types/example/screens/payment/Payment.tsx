import { useFlow } from 'react-flow-app';
import { paymentScreen } from './payment.screen';

export default function Payment() {
	const { dispatch, back, canGoBack } = useFlow(paymentScreen);

	return (
		<>
			<button onClick={() => dispatch('pay', { ok: true })}>Pagar</button>
			<button onClick={() => dispatch('cancel')}>Cancelar</button>
			{canGoBack && <button onClick={back}>Voltar</button>}
		</>
	);
}
