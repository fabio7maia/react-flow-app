// esbuild plugin: resolves `react-flow-app` and its subpaths to the sources (like the tsconfig paths).
import { join } from 'node:path';

export const libAliases = root => ({
	name: 'react-flow-app-sources',
	setup(build) {
		const entries = {
			'react-flow-app': 'src/index.ts',
			'react-flow-app/react': 'src/react/index.tsx',
			'react-flow-app/analytics': 'src/analytics/index.ts',
			'react-flow-app/testing': 'src/testing/index.ts',
		};
		build.onResolve({ filter: /^react-flow-app(\/(react|analytics|testing))?$/ }, args => ({ path: join(root, entries[args.path]) }));
	},
});
