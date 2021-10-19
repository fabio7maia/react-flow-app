import React from 'react';
import { FlowManager } from '@models';
import { TFlowManagerContext } from '@types';
import { Flow } from 'src/models/flow';

export const flowManagerContext = React.createContext<TFlowManagerContext>({
	currentFlowName: '',
	start: (flowName: string, stepName?: string): void => {
		console.log('flowManagerContext > start > Not init');
	},
	back: (): void => {
		console.log('flowManagerContext > back > Not init');
	},
	dispatch: (name: string, payload?: Record<string, any>): void => {
		console.log('flowManagerContext > dispatch > Not init');
	},
});

interface FlowProviderProps {
	fm: FlowManager<any, any, any>;
}

export const FlowProvider: React.FC<FlowProviderProps> = ({ fm, children }) => {
	const [_, setForceUpdate] = React.useState(0);
	const currentFlowName = React.useRef('');
	const flow = React.useRef<Flow>();
	// const [state, setState] = React.useState({
	// 	tick: 0,
	// 	currentFlowName: '',
	// 	currentStepName: '',
	// });

	// const flow = FlowManager.getFlow(currentFlowName);

	const forceUpdate = React.useCallback(() => {
		flow.current = fm.getFlow(currentFlowName.current);

		setForceUpdate(val => val + 1);
	}, []);

	const handleStart = React.useCallback(
		(flowName: string, stepName?: string, ignoreFromFlow?: boolean): void => {
			console.log('FlowProvider > handleStart', { flowName });

			const flow = fm.getFlow(flowName);

			flow?.start(stepName, ignoreFromFlow ? undefined : currentFlowName.current);

			currentFlowName.current = flowName;

			forceUpdate();
		},
		[forceUpdate]
	);

	const handleBack = React.useCallback(() => {
		const { changed, currentFlowName } = flow.current?.back();

		console.log('FlowProvider > back', { changed, currentFlowName });

		if (changed && currentFlowName) {
			handleStart(currentFlowName, undefined, true);
		} else if (changed) {
			forceUpdate();
		}
	}, [forceUpdate, handleStart]);

	const handleDispatch = React.useCallback(
		(name: string, payload?: Record<string, any>) => {
			const { changed, currentFlowName, currentStepName } = flow.current?.dispatch(name, payload);

			console.log('FlowProvider > dispatch', { name, payload, changed });

			if (currentFlowName) {
				handleStart(currentFlowName, currentStepName);
			} else {
				changed && forceUpdate();
			}
		},
		[forceUpdate, handleStart]
	);

	console.log('FlowProvider', { flow: flow.current });

	return (
		<flowManagerContext.Provider
			value={{
				currentFlowName: flow.current?.name,
				start: handleStart,
				back: handleBack,
				dispatch: handleDispatch,
			}}
		>
			{children}
			{flow.current?.render()}
		</flowManagerContext.Provider>
	);
};
