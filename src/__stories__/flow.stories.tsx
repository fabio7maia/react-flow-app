import React from 'react';
import { StorybookHelper } from '@react-flow-app/sb';
import { FlowProvider } from '@react-flow-app/providers';
import { useFlowManager } from '@react-flow-app/hooks';
import { f1, fm } from './flow';

const FlowExample: React.FC = () => {
	// eslint-disable-next-line react-hooks/rules-of-hooks
	const { start } = useFlowManager();

	// eslint-disable-next-line react-hooks/rules-of-hooks
	React.useEffect(() => {
		start(f1.start());
	}, [start]);

	return <></>;
};

const Flow = (): JSX.Element => <FlowExample />;

const story = StorybookHelper.writeStory({ component: Flow, group: 'Modules' });

export default story.meta;

const template: React.FC = () => (
	<FlowProvider fm={fm}>
		<FlowExample />
	</FlowProvider>
);

export const Default = template.bind({});

Default.args = {
	children: <h1>Flow example</h1>,
};
