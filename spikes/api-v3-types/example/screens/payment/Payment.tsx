import { useFlow, useStepParams } from 'react-flow-app';
import { paymentScreen } from './payment.screen';

export default function Payment() {
	const { dispatch, back, canGoBack } = useFlow(paymentScreen);
	const { orderId } = useStepParams('checkout', 'payment');

	return (
		<>
			<h1>Pagamento da encomenda {orderId}</h1>
			<button onClick={() => dispatch('pay', { ok: true })}>Pagar</button>
			<button onClick={() => dispatch('pay', { ok: false })}>Simular falha</button>
			<button onClick={() => dispatch('cancel')}>Cancelar</button>
			{canGoBack && <button onClick={back}>Voltar</button>}
		</>
	);
}
