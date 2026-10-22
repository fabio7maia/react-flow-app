import { defineConfig } from 'tsup';

// Subpath entries import the core by the package name, so it stays external: one copy of the
// engine at runtime (ESM and CJS) and one `Register` declaration for module augmentation.
const external = ['react', 'react-flow-app', /^react-flow-app\//];

export default defineConfig([
	{
		entry: {
			index: 'src/index.ts',
			react: 'src/react/index.tsx',
			analytics: 'src/analytics/index.ts',
			testing: 'src/testing/index.ts',
		},
		format: ['esm', 'cjs'],
		dts: true,
		clean: true,
		sourcemap: true,
		target: 'es2020',
		external,
		tsconfig: 'tsconfig.build.json',
	},
	{
		entry: { cli: 'src/cli/bin.ts' },
		format: ['esm'],
		platform: 'node',
		target: 'node18',
		external: [...external, 'jiti'],
		tsconfig: 'tsconfig.build.json',
	},
]);
