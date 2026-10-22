import { useFlow } from 'react-flow-app/react';
import { failureScreen } from './failure.screen';

export default function Failure() {
	const { dispatch } = useFlow(failureScreen);
	return (
		<>
			<h1>Payment failed</h1>
			<button onClick={() => dispatch('retry')}>Try again</button>
		</>
	);
}
