// Compila o spike (tipos + emit) para .out. Em runtime, `react-flow-app` resolve para o
// protótipo compilado (em tipos, via `paths`).
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const out = join(root, '.out');

export function build() {
	rmSync(out, { recursive: true, force: true });
	execFileSync(join(root, '../../node_modules/.bin/tsc'), ['-p', 'tsconfig.json'], { cwd: root, stdio: 'inherit' });

	const shim = join(out, 'node_modules/react-flow-app');
	mkdirSync(shim, { recursive: true });
	writeFileSync(join(shim, 'index.js'), "module.exports = require('../../lib/index.js');\n");
}
