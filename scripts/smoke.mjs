// Smoke test of the published package: `npm pack`, install the tarball in a consumer project and check
// the types (bundler and node16 resolution, Register augmentation across subpaths), ESM and CJS
// entries, and the CLI. Usage: node scripts/smoke.mjs  (run `yarn build` first)
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
// Inside the repo, so react, @types/react, typescript and jiti resolve from its node_modules.
const dir = join(root, '.smoke');
const consumer = join(dir, 'consumer');
const run = (command, args, cwd = consumer) => execFileSync(command, args, { cwd, encoding: 'utf8', stdio: 'pipe' });

rmSync(dir, { recursive: true, force: true });
mkdirSync(join(consumer, 'node_modules'), { recursive: true });

run('npm', ['pack', '--pack-destination', dir], root);
const tarball = readdirSync(dir).find(file => file.endsWith('.tgz'));
run('tar', ['-xzf', join(dir, tarball), '-C', join(consumer, 'node_modules')]);
run('mv', [join(consumer, 'node_modules/package'), join(consumer, 'node_modules/react-flow-app')]);
console.log(`✔ packed ${tarball}`);

writeFileSync(join(consumer, 'package.json'), JSON.stringify({ name: 'consumer', private: true, type: 'module' }));
writeFileSync(
	join(consumer, 'app.ts'),
	`import { createFlowApp, defineFlow, defineScreen, goto, payload } from 'react-flow-app';
import { segment } from 'react-flow-app/analytics';
import { useFlow, useFlowEvents } from 'react-flow-app/react';
import { getPaths } from 'react-flow-app/testing';

const loader = () => Promise.resolve({ default: () => null });
const cart = defineScreen({ name: 'cart', actions: { checkout: payload<{ total: number }>() }, meta: { title: 'Cart' }, loader });
const done = defineScreen({ name: 'done', actions: ['restart'], meta: { title: 'Done' }, loader });

const shop = defineFlow({ name: 'shop', steps: { cart: { screen: cart, initial: true }, done: { screen: done } } });
shop.transitions({ cart: { checkout: 'done' }, done: { restart: goto('shop', 'cart') } });

export const app = createFlowApp([shop]);

declare module 'react-flow-app' {
	interface Register {
		app: typeof app;
		meta: { title: string };
	}
}

// @ts-expect-error Register reaches the core: unknown flow
goto('nope');

export function Cart() {
	const { dispatch } = useFlow(cart);
	// @ts-expect-error the payload is typed by the screen
	dispatch('checkout', { total: 'ten' });
	// Register reaches the react entry: the action event payload is typed.
	useFlowEvents('action', event => {
		if (event.action === 'checkout') event.payload.total.toFixed();
	});
	return null;
}

// Register reaches the analytics entry: actions and payloads are typed.
segment({ actions: { checkout: payload => ({ name: 'Checkout', properties: { total: payload.total } }) } });

export const paths = getPaths(app, 'shop.cart');
`
);

for (const resolution of ['bundler', 'node16']) {
	writeFileSync(
		join(consumer, 'tsconfig.json'),
		JSON.stringify({
			compilerOptions: {
				strict: true,
				noEmit: true,
				target: 'es2022',
				lib: ['es2022', 'dom'],
				module: resolution === 'bundler' ? 'preserve' : 'node16',
				moduleResolution: resolution,
				jsx: 'react-jsx',
				skipLibCheck: false,
				types: [],
			},
			files: ['app.ts'],
		})
	);
	run(join(root, 'node_modules/.bin/tsc'), ['-p', 'tsconfig.json']);
	console.log(`✔ types (${resolution})`);
}

const entries = ['react-flow-app', 'react-flow-app/react', 'react-flow-app/analytics', 'react-flow-app/testing'];
run(process.execPath, [
	'--input-type=module',
	'-e',
	`for (const entry of ${JSON.stringify(entries)}) { const m = await import(entry); if (!Object.keys(m).length) throw new Error(entry); }`,
]);
console.log('✔ ESM import of every entry');
run(process.execPath, [
	'-e',
	`for (const entry of ${JSON.stringify(entries)}) { const m = require(entry); if (!Object.keys(m).length) throw new Error(entry); }`,
]);
console.log('✔ CJS require of every entry');

const cli = run(process.execPath, ['node_modules/react-flow-app/dist/cli.js', 'check', '--app', 'app.ts', '--write']);
if (!/2 steps, 2 transitions, 0 error\(s\)/.test(cli)) throw new Error(`unexpected CLI output:\n${cli}`);
console.log('✔ CLI: react-flow-app check loads a TypeScript app');

rmSync(dir, { recursive: true, force: true });
