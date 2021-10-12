import React from 'react';
import { StorybookHelper } from '@sb';
import { FlowProvider } from '@providers';
import './flow';
import { useFlowManager } from '@hooks';

const FlowExample: React.FC = () => {
	// eslint-disable-next-line react-hooks/rules-of-hooks
	const { start } = useFlowManager();

	// eslint-disable-next-line react-hooks/rules-of-hooks
	React.useEffect(() => {
		start('f0');
	}, [start]);

	return <></>;
};

const Flow = () => <FlowExample />;

const story = StorybookHelper.writeStory({ component: Flow, group: 'Modules' });

export default story.meta;

const template: React.FC = () => (
	<FlowProvider>
		<FlowExample />
	</FlowProvider>
);

export const Default = template.bind({});

Default.args = {
	children: <h1>Flow example</h1>,
};
