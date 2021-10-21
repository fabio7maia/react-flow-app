import React from 'react';
import { TStepAction, TStepOptions } from '../../types';

export class Step {
	name: string;
	url?: string;
	loader: () => React.LazyExoticComponent<React.ComponentType<any>>;
	actions: Record<string, TStepAction>;
	options?: TStepOptions;

	constructor(
		name: string,
		loader: () => React.LazyExoticComponent<React.ComponentType<any>>,
		options?: TStepOptions
	) {
		this.name = name;
		this.loader = loader;
		this.actions = {};
		this.options = options;
	}
}
