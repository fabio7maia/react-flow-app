// Compila o spike (tipos + emit) e corre os testes de runtime com node:test.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '.out');
const tsc = join(root, '../../node_modules/.bin/tsc');

rmSync(out, { recursive: true, force: true });
execFileSync(tsc, ['-p', 'tsconfig.json'], { cwd: root, stdio: 'inherit' });

// Em runtime, `react-flow-app` resolve para o protótipo compilado (em tipos, via `paths`).
const shim = join(out, 'node_modules/react-flow-app');
mkdirSync(shim, { recursive: true });
writeFileSync(join(shim, 'index.js'), "module.exports = require('../../lib/index.js');\n");

const suites = ['engine', 'parity', 'adapters'].map(name => join(out, `tests/${name}.test.js`));
execFileSync(process.execPath, ['--test', ...suites], {
	cwd: root,
	stdio: 'inherit',
});
