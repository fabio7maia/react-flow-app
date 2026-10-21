import { useFlow } from 'react-flow-app';
import { dashboardScreen } from './dashboard.screen';

export default function Dashboard() {
	const { dispatch } = useFlow(dashboardScreen);
	return <button onClick={() => dispatch('openCart')}>Ver carrinho</button>;
}
