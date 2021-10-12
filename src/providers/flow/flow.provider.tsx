import React from 'react';
import { FlowManager } from '@models';
import { TFlowManagerContext } from '@types';

export const flowManagerContext = React.createContext<TFlowManagerContext>({
	currentFlowName: '',
	start: (flowName: string): void => {
		console.log('flowManagerContext > start > Not init');
	},
	back: (): void => {
		console.log('flowManagerContext > back > Not init');
	},
	dispatch: (name: string, payload?: Record<string, any>): void => {
		console.log('flowManagerContext > dispatch > Not init');
	},
});

export const FlowProvider: React.FC = ({ children }) => {
	const [_, setForceUpdate] = React.useState(0);
	const [currentFlowName, setCurrentFlowName] = React.useState('');

	const flow = FlowManager.getFlow(currentFlowName);

	const handleStart = React.useCallback(
		(flowName: string): void => {
			console.log('FlowProvider > handleStart', { flowName });

			flow?.start();

			setCurrentFlowName(flowName);
		},
		[flow]
	);

	const handleBack = React.useCallback(() => {
		console.log('FlowProvider > back');

		const changed = flow?.back();

		changed && setForceUpdate(val => val + 1);
	}, [flow]);

	const handleDispatch = React.useCallback(
		(name: string, payload?: Record<string, any>) => {
			console.log('FlowProvider > dispatch [start]', { name, payload });

			const changed = flow?.dispatch(name, payload);

			console.log('FlowProvider > dispatch [end]', { name, payload, changed });

			changed && setForceUpdate(val => val + 1);
		},
		[flow]
	);

	console.log('FlowProvider', { flow, currentFlowName });

	return (
		<flowManagerContext.Provider
			value={{
				currentFlowName,
				start: handleStart,
				back: handleBack,
				dispatch: handleDispatch,
			}}
		>
			{children}
			{flow?.render()}
		</flowManagerContext.Provider>
	);
};
