// Runs `react-flow-app check` (from the sources) on the example app. Extra flags are passed through:
//   yarn check:flows --write | --base origin/v3 --report flows-report.md | --strict
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

// The CLI imports the core by package name: point it at the sources (no build needed), like the tests.
const src = path => fileURLToPath(new URL(`../src/${path}`, import.meta.url));
const jiti = createJiti(import.meta.url, {
	alias: {
		'react-flow-app/testing': src('testing/index.ts'),
		'react-flow-app/analytics': src('analytics/index.ts'),
		'react-flow-app/react': src('react/index.tsx'),
		'react-flow-app': src('index.ts'),
	},
});
const { main } = await jiti.import('../src/cli/index.ts');

process.exitCode = await main([
	'check',
	'--app',
	'examples/store/app.flow.ts',
	'--snapshot',
	'examples/store/flows.graph.json',
	'--diagram',
	'examples/store/FLOWS.md',
	...process.argv.slice(2),
]);
