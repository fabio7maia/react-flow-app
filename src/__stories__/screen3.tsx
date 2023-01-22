import React from 'react';
import { useFlow } from '../hooks';
import { screens } from './screens';

export const Screen3: React.FC = () => {
	const { dispatch } = useFlow(screens.screen3);

	return (
		<>
			<h1>Screen 3</h1>
			<div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
				<div>
					<button onClick={(): void => dispatch('end')}>Next</button>
				</div>
			</div>
		</>
	);
};

export default Screen3;
