import { useFlow } from 'react-flow-app';
import { cartScreen } from './cart.screen';

export default function Cart() {
	const { dispatch, back, canGoBack } = useFlow(cartScreen);

	return (
		<section style={{ minHeight: '200vh' }}>
			<h1>Carrinho</h1>
			<button onClick={() => dispatch('checkout', { loggedIn: true }, { params: { orderId: '42' } })}>
				Finalizar compra
			</button>
			<button onClick={() => dispatch('checkout', { loggedIn: false })}>Entrar e comprar</button>
			{canGoBack && <button onClick={back}>Voltar</button>}
		</section>
	);
}
