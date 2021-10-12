import React from 'react';
import { flowManagerContext } from '@providers';
import { TScreen } from '@types';

export const useFlow = <TScreenInner extends TScreen>(screen?: TScreenInner) => {
	const { back, dispatch } = React.useContext(flowManagerContext);

	return {
		back: back,
		dispatch: (name: TScreenInner['actions'][number], payload?: Record<string, any>) => {
			dispatch(name, payload);
		},
	};
};

export const useFlowManager = () => {
	const { start } = React.useContext(flowManagerContext);

	return {
		start,
	};
};
