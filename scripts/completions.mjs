// Checks the real intellisense (the same language service as VS Code) at key points of the API.
// Each `|` below is a cursor position; the suggestions are compared with the expected ones.
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)(join(root, 'node_modules/typescript'));

const probes = [
	{
		name: "goto('|') suggests the registered flows",
		code: "goto('|');",
		expected: ['auth', 'checkout', 'home'],
	},
	{
		name: "goto('auth', '|') suggests only the steps of flow auth",
		code: "goto('auth', '|');",
		expected: ['login'],
	},
	{
		name: 'transitions: keys of the payment step = actions of its screen',
		code: 'checkoutFlow.transitions({ payment: { | } });',
		expected: ['cancel', 'pay'],
	},
	{
		name: 'transitions: a local target suggests the steps of the flow',
		code: "checkoutFlow.transitions({ failure: { retry: '|' } });",
		expected: ['cart', 'failure', 'payment', 'success'],
	},
	{
		name: "dispatch('|') on the payment screen",
		code: "function P() { const { dispatch } = useFlow(paymentScreen); dispatch('|'); }",
		expected: ['cancel', 'pay'],
	},
	{
		name: 'payload of pay: suggested properties',
		code: "function P() { const { dispatch } = useFlow(paymentScreen); dispatch('pay', { | }); }",
		expected: ['ok'],
	},
	{
		name: 'branch: the keys of samples are the declared targets',
		code: "checkoutFlow.transitions({ payment: { pay: branch(['success', 'failure'], () => 'success', { samples: { | } }) } });",
		expected: ['failure', 'success'],
	},
	{
		name: "useFlowEvents('|') suggests the event types",
		code: "useFlowEvents('|', () => {});",
		expected: ['*', 'action', 'action:unhandled', 'back:empty', 'flow:exit', 'flow:start', 'step:enter', 'step:leave'],
	},
	{
		name: 'action event: e.action suggests every action of every flow',
		code: "useFlowEvents('action', e => { if (e.action === '|') {} });",
		expected: ['cancel', 'checkout', 'finish', 'loggedIn', 'openCart', 'pay', 'retry'],
	},
	{
		name: "start('checkout', 'payment', { params: { | } }) suggests the URL params of the step",
		code: "createFlowEngine(flowApp).start('checkout', 'payment', { params: { | } });",
		expected: ['orderId'],
	},
	{
		name: "engine.start('checkout', '|') suggests only checkout steps",
		code: "createFlowEngine(flowApp).start('checkout', '|');",
		expected: ['cart', 'failure', 'payment', 'success'],
	},
	{
		name: 'segment({ actions: { | } }) suggests the actions of every flow',
		code: 'segment({ actions: { | } });',
		expected: ['cancel', 'checkout', 'finish', 'loggedIn', 'openCart', 'pay', 'retry'],
	},
];

const header = `import { branch, createFlowEngine, goto } from 'react-flow-app';
import { segment } from 'react-flow-app/analytics';
import { useFlow, useFlowEvents } from 'react-flow-app/react';
import { flowApp } from './app.flow';
import { checkoutFlow } from './flows/checkout.flow';
import { paymentScreen } from './screens/payment/payment.screen';
`;

const config = ts.getParsedCommandLineOfConfigFile(
	join(root, 'tsconfig.json'),
	{},
	{ ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} }
);
const probeFile = join(root, 'examples/store/__completions__.ts');
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
	if (!ok) console.log(`    expected: ${probe.expected.join(', ')}\n    received: ${names.join(', ') || '(nothing)'}`);
}

process.exitCode = failures > 0 ? 1 : 0;
