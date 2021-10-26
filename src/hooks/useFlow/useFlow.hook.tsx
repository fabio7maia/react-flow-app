import React from 'react';
import { flowManagerContext } from '../../providers';
import { TFlowManagerStartMethodOutput, TScreen } from '../../types';

export const useFlow = <TScreenInner extends TScreen>(screen?: TScreenInner) => {
	const { back, dispatch, currentFlowName, fm, refresh } = React.useContext(flowManagerContext);
	const flow = fm.getFlow(currentFlowName);

	const handleDispatch = React.useCallback(
		(name: TScreenInner['actions'][number], payload?: Record<string, any>): void => {
			dispatch(name, payload);
		},
		[dispatch]
	);

	const getCurrentStep = React.useCallback(flow.getCurrentStep, [flow]);

	const getPreviousStep = React.useCallback(flow.getPreviousStep, [flow]);

	const getHistory = React.useCallback(flow.getHistory, [flow]);

	return {
		back: back,
		dispatch: handleDispatch,
		getCurrentStep,
		getHistory,
		getPreviousStep,
		refresh,
	};
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const useFlowManager = () => {
	const { start } = React.useContext(flowManagerContext);

	const handleStart = React.useCallback(
		({ flowName, stepName }: TFlowManagerStartMethodOutput): void => {
			start(flowName, stepName);
		},
		[start]
	);

	return {
		start: handleStart,
	};
};
