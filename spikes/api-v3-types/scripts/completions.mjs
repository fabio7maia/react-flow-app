// Verifica o intellisense real (o mesmo language service do VS Code) em pontos-chave da API.
// Cada `|` no código abaixo é uma posição do cursor; comparamos as sugestões com o esperado.
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)(join(root, '../../node_modules/typescript'));

const probes = [
	{
		name: "goto('|') sugere os flows registados",
		code: "goto('|');",
		expected: ['auth', 'checkout', 'home'],
	},
	{
		name: "goto('auth', '|') sugere só os passos do flow auth",
		code: "goto('auth', '|');",
		expected: ['login'],
	},
	{
		name: 'transitions: chaves do passo payment = ações do ecrã',
		code: 'checkoutFlow.transitions({ payment: { | } });',
		expected: ['cancel', 'pay'],
	},
	{
		name: 'transitions: destino local sugere os passos do flow',
		code: "checkoutFlow.transitions({ failure: { retry: '|' } });",
		expected: ['cart', 'failure', 'payment', 'success'],
	},
	{
		name: "dispatch('|') no ecrã payment",
		code: "function P() { const { dispatch } = useFlow(paymentScreen); dispatch('|'); }",
		expected: ['cancel', 'pay'],
	},
	{
		name: 'payload de pay: propriedades sugeridas',
		code: "function P() { const { dispatch } = useFlow(paymentScreen); dispatch('pay', { | }); }",
		expected: ['ok'],
	},
	{
		name: "useFlowEvents('|') sugere os tipos de evento",
		code: "useFlowEvents('|', () => {});",
		expected: ['*', 'action', 'action:unhandled', 'flow:exit', 'flow:start', 'step:enter', 'step:leave'],
	},
	{
		name: 'evento action: e.action sugere todas as ações de todos os flows',
		code: "useFlowEvents('action', e => { if (e.action === '|') {} });",
		expected: ['cancel', 'checkout', 'finish', 'loggedIn', 'openCart', 'pay', 'retry'],
	},
	{
		name: "engine.start('checkout', '|') sugere só passos do checkout",
		code: "createFlowEngine(flowApp).start('checkout', '|');",
		expected: ['cart', 'failure', 'payment', 'success'],
	},
];

const header = `import { createFlowEngine, goto, useFlow, useFlowEvents } from 'react-flow-app';
import { flowApp } from './app.flow';
import { checkoutFlow } from './flows/checkout.flow';
import { paymentScreen } from './screens/payment/payment.screen';
`;

const config = ts.getParsedCommandLineOfConfigFile(join(root, 'tsconfig.json'), {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} });
const probeFile = join(root, 'example/__completions__.ts');
let probeText = '';

const host = {
	getCompilationSettings: () => config.options,
	getScriptFileNames: () => [...config.fileNames, probeFile],
	getScriptVersion: () => String(probeText.length) + probeText,
	getScriptSnapshot: file => {
		if (file === probeFile) return ts.ScriptSnapshot.fromString(probeText);
		return existsSync(file) ? ts.ScriptSnapshot.fromString(readFileSync(file, 'utf8')) : undefined;
	},
	getCurrentDirectory: () => root,
	getDefaultLibFileName: options => ts.getDefaultLibFilePath(options),
	fileExists: file => file === probeFile || ts.sys.fileExists(file),
	readFile: file => (file === probeFile ? probeText : ts.sys.readFile(file)),
	readDirectory: ts.sys.readDirectory,
	directoryExists: ts.sys.directoryExists,
	getDirectories: ts.sys.getDirectories,
};

const service = ts.createLanguageService(host, ts.createDocumentRegistry());
let failures = 0;

for (const probe of probes) {
	const body = probe.code.replace('|', '');
	probeText = header + body;
	const position = header.length + probe.code.indexOf('|');
	const started = performance.now();
	const result = service.getCompletionsAtPosition(probeFile, position, {});
	const elapsed = Math.round(performance.now() - started);
	const names = [...new Set((result?.entries ?? []).map(entry => entry.name.replace(/^["']|["']$/g, '')))].sort();
	const ok = JSON.stringify(names) === JSON.stringify([...probe.expected].sort());

	if (!ok) failures++;
	console.log(`${ok ? '✔' : '✘'} ${probe.name} (${elapsed} ms)`);
	if (!ok) console.log(`    esperado: ${probe.expected.join(', ')}\n    obtido:   ${names.join(', ') || '(nada)'}`);
}

process.exitCode = failures > 0 ? 1 : 0;
