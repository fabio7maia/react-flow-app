// Runs `react-flow-app check` (from the sources) on the example app. Extra flags are passed through:
//   yarn check:flows --write | --base origin/v3 --report flows-report.md | --strict
import { createJiti } from 'jiti';

const jiti = createJiti(import.meta.url);
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
