import React, { JSX } from 'react';
import { Meta } from '@storybook/react';
import { StorybookHelper } from '../storybook';
import { FlowProvider } from '../providers';
import { fm, f0 } from './flow';
import { StepRender } from '../components';
import { useFlow, useFlowManager } from '../hooks';

const Flow = (): JSX.Element => {
	return <h1>Only to working properly in storybook tree</h1>;
};

const story = StorybookHelper.writeStory({ component: Flow, group: 'Modules' });
const meta: Meta = {
	...story.meta,
	title: 'Modules/Flow',
};

export default meta;

const template: React.FC = () => <FlowProvider fm={fm} initialFlowName="f2" />;

export const Simple = template.bind({});

Simple.args = {
	children: <h1>Flow example</h1>,
};

const TopContainer = () => {
	const { currentFlowName } = useFlowManager();
	const { back, hasPreviousStep } = useFlow();

	return (
		<div
			style={{
				backgroundColor: currentFlowName === f0.name() ? 'red' : 'blue',
				color: '#fff',
				padding: '20px',
				borderRadius: '16px',
				margin: '0 0 24px 0',
			}}
		>
			{hasPreviousStep() && <button onClick={back}>Back</button>} Top container
		</div>
	);
};

const BottomContainer = () => {
	return (
		<div
			style={{
				backgroundColor: 'green',
				color: '#fff',
				padding: '20px',
				borderRadius: '16px',
				margin: '24px 0 0 0',
			}}
		>
			Bottom container
		</div>
	);
};

const template2: React.FC = () => (
	<FlowProvider
		fm={fm}
		initialFlowName="f2"
		options={{
			animation: false,
			withUrl: false,
		}}
	>
		<TopContainer />
		<StepRender />
		<BottomContainer />
	</FlowProvider>
);

export const CustomTemplate = template2.bind({});

CustomTemplate.args = {
	children: <h1>Flow example</h1>,
};
