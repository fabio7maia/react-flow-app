import { useFlow } from 'react-flow-app/react';
import { successScreen } from './success.screen';

export default function Success() {
	const { dispatch } = useFlow(successScreen);
	return (
		<>
			<h1>Order complete</h1>
			<button onClick={() => dispatch('finish')}>Back to home</button>
		</>
	);
}
