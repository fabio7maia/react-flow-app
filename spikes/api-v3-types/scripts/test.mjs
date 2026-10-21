// Compila o spike e corre os testes de runtime com node:test.
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { build, out, root } from './build.mjs';

build();

const suites = ['engine', 'events.contract', 'parity', 'adapters', 'analytics', 'check', 'react'].map(name =>
	join(out, `tests/${name}.test.js`)
);
execFileSync(process.execPath, ['--test', ...suites], { cwd: root, stdio: 'inherit' });
