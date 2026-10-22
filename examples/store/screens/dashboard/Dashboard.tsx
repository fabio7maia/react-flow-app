import { useFlow } from 'react-flow-app/react';
import { dashboardScreen } from './dashboard.screen';

export default function Dashboard() {
	const { dispatch } = useFlow(dashboardScreen);
	return (
		<>
			<h1>Home</h1>
			<button onClick={() => dispatch('openCart')}>View cart</button>
		</>
	);
}
