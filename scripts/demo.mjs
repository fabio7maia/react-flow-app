// Builds the demo as a single HTML page (to publish or open in a browser).
// React and ReactDOM come from the CDN (UMD 18.3.1); the rest (library, example, demo) is one inline script.
// Usage: node scripts/demo.mjs  →  .demo/index.html
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { libAliases } from './lib-aliases.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '.demo');

const globals = {
	react: 'module.exports = window.React;',
	'react-dom/client': 'module.exports = window.ReactDOM;',
	// The UMD build has no jsx-runtime: an equivalent with createElement.
	'react/jsx-runtime':
		'const R = window.React; const jsx = (type, props, key) => R.createElement(type, key === undefined ? props : { ...props, key });' +
		' module.exports = { jsx, jsxs: jsx, Fragment: R.Fragment };',
};

const plugin = {
	name: 'demo',
	setup(build) {
		build.onResolve({ filter: /^(react|react-dom\/client|react\/jsx-runtime)$/ }, args => ({ path: args.path, namespace: 'global' }));
		build.onLoad({ filter: /.*/, namespace: 'global' }, args => ({ contents: globals[args.path], loader: 'js' }));
		build.onResolve({ filter: /\?raw$/ }, args => ({
			path: resolve(args.resolveDir, args.path.replace(/\?raw$/, '')),
			namespace: 'raw',
		}));
		build.onLoad({ filter: /.*/, namespace: 'raw' }, args => ({ contents: readFileSync(args.path, 'utf8'), loader: 'text' }));
	},
};

const result = await esbuild.build({
	entryPoints: [join(root, 'examples/store/demo/main.tsx')],
	bundle: true,
	format: 'iife',
	write: false,
	minify: true,
	target: 'es2020',
	jsx: 'automatic',
	define: { 'process.env.NODE_ENV': '"production"' },
	plugins: [libAliases(root), plugin],
	logLevel: 'warning',
});

const script = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync(join(root, 'examples/store/demo/demo.css'), 'utf8');
const html = `<title>Inside the Example Store</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Overpass:wght@400;600;800&family=Overpass+Mono:wght@400;600&display=swap">
<style>
${css}
</style>
<div id="demo"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script>
${script}
</script>
`;

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'index.html'), html);
console.log(`.demo/index.html (${(html.length / 1024).toFixed(0)} KB)`);
