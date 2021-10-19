import React from 'react';
import { flowManagerContext } from '@providers';
import { TFlowStartMethodOutput, TScreen } from '@types';

export const useFlow = <TScreenInner extends TScreen>(screen?: TScreenInner) => {
	const { back, dispatch } = React.useContext(flowManagerContext);

	const handleDispatch = React.useCallback(
		(name: TScreenInner['actions'][number], payload?: Record<string, any>): void => {
			dispatch(name, payload);
		},
		[dispatch]
	);

	return {
		back: back,
		dispatch: handleDispatch,
	};
};

export const useFlowManager = () => {
	const { start } = React.useContext(flowManagerContext);

	const handleStart = React.useCallback(
		({ flowName, stepName }: TFlowStartMethodOutput): void => {
			start(flowName, stepName);
		},
		[start]
	);

	return {
		start: handleStart,
	};
};
