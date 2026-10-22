import { useFlow } from 'react-flow-app/react';
import { cartScreen } from './cart.screen';

export default function Cart() {
	const { dispatch, back, canGoBack } = useFlow(cartScreen);

	return (
		<section style={{ minHeight: '200vh' }}>
			<h1>Cart</h1>
			<button onClick={() => dispatch('checkout', { loggedIn: true }, { params: { orderId: '42' } })}>Checkout</button>
			<button onClick={() => dispatch('checkout', { loggedIn: false })}>Log in and buy</button>
			{canGoBack && <button onClick={back}>Back</button>}
		</section>
	);
}
