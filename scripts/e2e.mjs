// Builds the example (esbuild, with real code splitting), serves it locally and runs the browser e2e tests.
// Usage: node scripts/e2e.mjs   (E2E_BROWSERS=chromium,firefox,webkit to pick browsers)
import { spawn } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { libAliases } from './lib-aliases.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '.e2e');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

await esbuild.build({
	entryPoints: [join(root, 'examples/store/main.tsx')],
	bundle: true,
	splitting: true,
	format: 'esm',
	outdir: out,
	jsx: 'automatic',
	plugins: [libAliases(root)],
	define: { 'process.env.NODE_ENV': '"development"' },
	logLevel: 'warning',
});
writeFileSync(
	join(out, 'index.html'),
	'<!doctype html><html><head><meta charset="utf-8"><title>react-flow-app e2e</title></head>' +
		'<body><div id="root"></div><script type="module" src="/main.js"></script></body></html>'
);

// A page of "another site" for the tests that leave the app with the browser back button.
writeFileSync(
	join(out, 'previous.html'),
	'<!doctype html><html><head><meta charset="utf-8"><title>Before</title></head><body><p>Previous page</p></body></html>'
);

const types = { '.html': 'text/html', '.js': 'text/javascript' };
const server = createServer((request, response) => {
	const path = join(out, decodeURIComponent(new URL(request.url, 'http://x').pathname));
	const file = existsSync(path) && extname(path) ? path : join(out, 'index.html');
	response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
	createReadStream(file).pipe(response);
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

// Async spawn: an execFileSync would block the event loop and the server would stop answering.
const child = spawn(process.execPath, ['--test', '--test-concurrency=1', join(root, 'e2e/browser.e2e.mjs')], {
	cwd: root,
	stdio: 'inherit',
	env: { ...process.env, BASE_URL: baseUrl },
});
const code = await new Promise(done => child.on('exit', done));
server.close();
process.exitCode = code ?? 1;
