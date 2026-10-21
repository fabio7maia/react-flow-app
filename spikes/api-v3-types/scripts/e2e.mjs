// Build do exemplo (esbuild, com code-splitting real), servidor HTTP local e testes e2e no browser.
// Uso: node scripts/e2e.mjs
import { spawn } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '.e2e');
const esbuild = createRequire(import.meta.url)(join(root, '../../node_modules/esbuild'));

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

await esbuild.build({
	entryPoints: [join(root, 'example/main.tsx')],
	bundle: true,
	splitting: true,
	format: 'esm',
	outdir: out,
	jsx: 'automatic',
	alias: { 'react-flow-app': join(root, 'lib/index.ts') },
	define: { 'process.env.NODE_ENV': '"development"' },
	logLevel: 'warning',
});
writeFileSync(
	join(out, 'index.html'),
	'<!doctype html><html><head><meta charset="utf-8"><title>react-flow-app e2e</title></head>' +
		'<body><div id="root"></div><script type="module" src="/main.js"></script></body></html>'
);

// Uma página de "outro site" para os testes de sair da app pelo back do browser.
writeFileSync(join(out, 'previous.html'), '<!doctype html><html><head><meta charset="utf-8"><title>Antes</title></head><body><p>Página anterior</p></body></html>');

const types = { '.html': 'text/html', '.js': 'text/javascript' };
const server = createServer((request, response) => {
	const path = join(out, decodeURIComponent(new URL(request.url, 'http://x').pathname));
	const file = existsSync(path) && extname(path) ? path : join(out, 'index.html');
	response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
	createReadStream(file).pipe(response);
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

// spawn assíncrono: um execFileSync bloquearia o event loop e o servidor deixaria de responder.
const child = spawn(process.execPath, ['--test', '--test-concurrency=1', join(root, 'e2e/browser.e2e.mjs')], {
	cwd: root,
	stdio: 'inherit',
	env: { ...process.env, BASE_URL: baseUrl },
});
const code = await new Promise(done => child.on('exit', done));
server.close();
process.exitCode = code ?? 1;
