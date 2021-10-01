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
	doAction: (name: string, payload?: Record<string, any>): void => {
		console.log('flowManagerContext > doAction > Not init');
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

	const handleDoAction = React.useCallback(
		(name: string, payload?: Record<string, any>) => {
			console.log('FlowProvider > doAction', { name, payload });

			const changed = flow?.doAction(name, payload);

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
				doAction: handleDoAction,
			}}
		>
			{children}
			{flow?.render()}
		</flowManagerContext.Provider>
	);
};
