// Generates a synthetic app (N flows × M screens, one file per screen/component/flow) and measures `tsc`.
// Each screen has an action with a unique name (next_<screen>), so the event union has one member per screen.
// Usage: node scripts/bench.mjs [flows=50] [stepsPerFlow=6]
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tsc = join(root, 'node_modules/.bin/tsc');
const flows = Number(process.argv[2] ?? 50);
const steps = Number(process.argv[3] ?? 6);
const dir = join(root, `.bench/${flows}x${steps}`);

rmSync(dir, { recursive: true, force: true });
const write = (file, content) => {
	mkdirSync(dirname(join(dir, file)), { recursive: true });
	writeFileSync(join(dir, file), content);
};

for (let f = 0; f < flows; f++) {
	const imports = [];
	const stepDefs = [];
	const transitions = [];

	for (let s = 0; s < steps; s++) {
		const name = `f${f}s${s}`;
		write(
			`screens/${name}/${name}.screen.ts`,
			`import { defineScreen, payload } from 'react-flow-app';
export const ${name}Screen = defineScreen({
	name: '${name}',
	actions: { next_${name}: payload<{ ok: boolean; value: number }>(), skip: null, leave: null },
	meta: { title: '${name}' },
	loader: () => import('./${name}'),
});
`
		);
		write(
			`screens/${name}/${name}.tsx`,
			`import { useFlow } from 'react-flow-app/react';
import { ${name}Screen } from './${name}.screen';
export default function Screen() {
	const { dispatch, canGoBack } = useFlow(${name}Screen);
	return <>{canGoBack && <button onClick={() => dispatch('next_${name}', { ok: true, value: 1 })}>next</button>}</>;
}
`
		);
		imports.push(`import { ${name}Screen } from '../screens/${name}/${name}.screen';`);
		stepDefs.push(`		s${s}: { screen: ${name}Screen${s === 0 ? ', initial: true' : ''} },`);

		const next = `s${(s + 1) % steps}`;
		const skip = `s${(s + 2) % steps}`;
		const leave = s === steps - 1 ? 'goto.exit()' : `goto('flow${(f + 1) % flows}', 's0')`;
		transitions.push(
			`	s${s}: { next_${name}: branch(['${next}', '${skip}'], (_, p) => (p.ok ? '${next}' : '${skip}')), skip: '${skip}', leave: ${leave} },`
		);
	}

	write(
		`flows/flow${f}.flow.ts`,
		`import { branch, defineFlow, goto } from 'react-flow-app';
${imports.join('\n')}
export const flow${f} = defineFlow({
	name: 'flow${f}',
	steps: {
${stepDefs.join('\n')}
	},
});
flow${f}.transitions({
${transitions.join('\n')}
});
`
	);
}

const flowNames = Array.from({ length: flows }, (_, f) => `flow${f}`);
write(
	'app.flow.ts',
	`import { createFlowApp } from 'react-flow-app';
${flowNames.map(name => `import { ${name} } from './flows/${name}.flow';`).join('\n')}
export const flowApp = createFlowApp([${flowNames.join(', ')}]);
declare module 'react-flow-app' {
	interface Register {
		app: typeof flowApp;
		meta: { title: string };
	}
}
`
);
write(
	'events.ts',
	`import { createFlowEngine } from 'react-flow-app';
import { segment } from 'react-flow-app/analytics';
import { flowApp } from './app.flow';
createFlowEngine(flowApp).on('action', e => {
	if (e.action === 'next_f0s0') console.log(e.payload.value);
});
segment({ actions: { next_f0s0: payload => ({ name: 'next', properties: { value: payload.value } }) } });
`
);
write(
	'tsconfig.json',
	JSON.stringify(
		{
			compilerOptions: {
				strict: true,
				noEmit: true,
				target: 'es2022',
				lib: ['es2022', 'dom'],
				module: 'commonjs',
				moduleResolution: 'node10',
				jsx: 'react-jsx',
				skipLibCheck: true,
				types: ['react'],
				typeRoots: [join(root, 'node_modules/@types')],
				paths: {
					'react-flow-app': [join(root, 'src/index.ts')],
					'react-flow-app/react': [join(root, 'src/react/index.tsx')],
					'react-flow-app/*': [join(root, 'src/*/index.ts')],
				},
			},
			include: ['.'],
		},
		null,
		'\t'
	)
);

const output = execFileSync(tsc, ['-p', join(dir, 'tsconfig.json'), '--extendedDiagnostics'], { encoding: 'utf8' });
const pick = label => output.match(new RegExp(`^${label}:\\s+(.+)$`, 'm'))?.[1]?.trim();

console.log(`${flows} flows × ${steps} steps = ${flows * steps} screens (${flows * steps * 2 + flows + 2} files)`);
for (const label of ['Files', 'Types', 'Instantiations', 'Memory used', 'Check time', 'Total time']) {
	console.log(`  ${label.padEnd(15)} ${pick(label)}`);
}
