import React from 'react';
import { StorybookHelper } from '../storybook';
import { FlowProvider } from '../providers';
import { fm } from './flow';

const Flow = (): JSX.Element => {
	return <FlowProvider fm={fm} initialFlowName="f2" />;
};

const story = StorybookHelper.writeStory({ component: Flow, group: 'Modules' });

export default story.meta;

const template: React.FC = () => <Flow />;

export const Default = template.bind({});

Default.args = {
	children: <h1>Flow example</h1>,
};
