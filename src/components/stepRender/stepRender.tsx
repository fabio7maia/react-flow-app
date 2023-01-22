import React from 'react';
import { flowManagerContext } from '../../providers';

export const StepRender: React.FC = () => {
	const { currentFlowName, fm, options } = React.useContext(flowManagerContext);
	const flow = fm.getFlow(currentFlowName);

	return <>{flow.render(options)}</>;
};
