import React from 'react';
import { flowManagerContext } from '@react-flow-app/providers';
import { TFlowManagerStartMethodOutput, TScreen } from '@react-flow-app/types';

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
