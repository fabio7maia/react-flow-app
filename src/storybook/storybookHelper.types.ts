import React, { ComponentType } from 'react';

export interface WriteStoryInput {
	group?: string;
	component: ComponentType<any>;
	args?: Record<string, object>;
}

export interface WriteStoryOutput {
	meta: any;
	template: (props) => React.ReactNode;
	stories: any;
}
