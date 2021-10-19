import React from 'react';
import { StorybookHelper } from '@sb';
import { FlowProvider } from '@providers';
import { useFlowManager } from '@hooks';
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
