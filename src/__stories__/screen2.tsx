import React from 'react';
import { useFlow } from '../hooks';
import { screens } from './screens';

export const Screen2: React.FC = () => {
	const { back, dispatch } = useFlow(screens.screen2);

	return (
		<>
			<h1>Screen 2</h1>
			<div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
				<div>
					<button onClick={back}>Back</button>
				</div>
				<div>
					<button onClick={(): void => dispatch('next')}>Next</button>
				</div>
			</div>
		</>
	);
};

export default Screen2;
