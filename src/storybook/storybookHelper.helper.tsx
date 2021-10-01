import React from 'react';
import { WriteStoryInput, WriteStoryOutput } from './storybookHelper.types';

export class StorybookHelper {
	static writeStory(input: WriteStoryInput): WriteStoryOutput {
		const { component: Component, args, group = 'General' } = input;

		const template = (props): React.ReactNode => <Component {...props} />;

		const stories = {};

		if (args) {
			Object.keys(args).forEach(elem => {
				stories[elem] = template.bind({});
				stories[elem].args = args[elem];
			});
		}

		return {
			meta: {
				title: `${group}/${Component.displayName}`,
				component: Component,
				decorators: [
					(story, context): React.ReactNode => {
						return story();
					},
				],
			},
			template,
			stories,
		};
	}
}
