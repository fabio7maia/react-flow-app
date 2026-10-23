import { defineConfig, type Options } from 'tsup';

// Subpath entries import the core by the package name, so it stays external: one copy of the
// engine at runtime (ESM and CJS) and one `Register` declaration for module augmentation.
const external = ['react', 'react-flow-app', /^react-flow-app\//];

// No `clean`: the configs build in parallel and would wipe each other's output (`yarn build` clears dist first).
const library: Options = {
	format: ['esm', 'cjs'],
	dts: true,
	sourcemap: true,
	target: 'es2020',
	external,
	tsconfig: 'tsconfig.build.json',
};

export default defineConfig([
	{
		...library,
		entry: { index: 'src/index.ts', analytics: 'src/analytics/index.ts', testing: 'src/testing/index.ts' },
	},
	{
		...library,
		entry: { react: 'src/react/index.tsx' },
		// Hooks and the Provider are client components (Next.js App Router, React Server Components).
		banner: { js: "'use client';" },
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
