import React from 'react';
import { flowManagerContext } from '@providers';
import { TScreen } from '@types';

export const useFlow = <TScreenInner extends TScreen>(screen?: TScreenInner) => {
	const { back, doAction } = React.useContext(flowManagerContext);

	return {
		back: back,
		doAction: (name: TScreen['actions'][number], payload?: Record<string, any>) => {
			doAction(name, payload);
		},
	};
};

export const useFlowManager = () => {
	const { start } = React.useContext(flowManagerContext);

	return {
		start,
	};
};
