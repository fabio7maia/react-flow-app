import React from 'react';
import { useFlow } from '../hooks';
import { screens } from './screens';

export const Screen1: React.FC = () => {
	const { back, dispatch } = useFlow(screens.screen1);

	return (
		<>
			<h1>Screen 1</h1>
			<div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
				<div>
					<button onClick={back}>Back</button>
				</div>
				<div>
					<button onClick={(): void => dispatch('skip')}>Skip</button>
				</div>
				<div>
					<button onClick={(): void => dispatch('next')}>Next</button>
				</div>
			</div>
		</>
	);
};

export default Screen1;
