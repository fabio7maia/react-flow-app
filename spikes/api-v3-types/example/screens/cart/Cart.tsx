import { useFlow } from 'react-flow-app';
import { cartScreen } from './cart.screen';

export default function Cart() {
	const { dispatch } = useFlow(cartScreen);
	return <button onClick={() => dispatch('checkout', { loggedIn: false })}>Finalizar compra</button>;
}
