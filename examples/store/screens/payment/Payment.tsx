import { useFlow, useStepParams } from 'react-flow-app/react';
import { paymentScreen } from './payment.screen';

export default function Payment() {
	const { dispatch, back, canGoBack } = useFlow(paymentScreen);
	const { orderId } = useStepParams('checkout', 'payment');

	return (
		<>
			<h1>Payment for order {orderId}</h1>
			<button onClick={() => dispatch('pay', { ok: true })}>Pay</button>
			<button onClick={() => dispatch('pay', { ok: false })}>Simulate failure</button>
			<button onClick={() => dispatch('cancel')}>Cancel</button>
			{canGoBack && <button onClick={back}>Back</button>}
		</>
	);
}
