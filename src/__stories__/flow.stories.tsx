import React from 'react';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import { StorybookHelper } from '../storybook';
import { FlowProvider } from '../providers';
import { useFlowManager } from '../hooks';
import { f2, fm } from './flow';

const FlowExample: React.FC = () => {
	// eslint-disable-next-line react-hooks/rules-of-hooks
	const { start } = useFlowManager();

	// eslint-disable-next-line react-hooks/rules-of-hooks
	React.useEffect(() => {
		start(f2.start());
	}, []);

	return <h1>Test</h1>;
};

const RouteFlowTest = (): JSX.Element => {
	return (
		<Route
			render={(): React.ReactNode => (
				<FlowProvider fm={fm}>
					<FlowExample />
				</FlowProvider>
			)}
		/>
	);
};

const Flow = (): JSX.Element => <FlowExample />;

const story = StorybookHelper.writeStory({ component: Flow, group: 'Modules' });

export default story.meta;

const template: React.FC = () => (
	<Router>
		<RouteFlowTest />
	</Router>
);

export const Default = template.bind({});

Default.args = {
	children: <h1>Flow example</h1>,
};
