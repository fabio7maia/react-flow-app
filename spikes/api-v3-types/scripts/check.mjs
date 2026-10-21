// Protótipo de `react-flow-app check`: valida os flows, mantém o snapshot do grafo e o diagrama
// no repo, e compara com a branch base.
//
//   npm run check                       valida; falha se houver erros ou se o snapshot estiver desatualizado
//   npm run check -- --write            atualiza example/flows.graph.json e example/FLOWS.md
//   npm run check -- --base origin/v3   + resumo das alterações face à base (markdown, para o PR)
//   npm run check -- --report out.md    escreve esse resumo num ficheiro (ex.: para um comentário de CI)
//   --strict                            avisos também falham
//   --no-build                          usa o .out já compilado
//
// Na lib, o app viria de um ficheiro de configuração carregado com TS (jiti/tsx). No spike, do .out.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative } from 'node:path';
import { build, out, root } from './build.mjs';

const args = process.argv.slice(2);
const flag = name => args.includes(`--${name}`);
const option = name => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined);

if (!flag('no-build')) build();

const require = createRequire(import.meta.url);
const { check, toMermaid } = require(join(out, 'node_modules/react-flow-app'));
const { flowApp } = require(join(out, 'example/app.flow.js'));

const snapshotFile = join(root, 'example/flows.graph.json');
const diagramFile = join(root, 'example/FLOWS.md');
const readJson = text => (text ? JSON.parse(text) : undefined);

const committed = existsSync(snapshotFile) ? readJson(readFileSync(snapshotFile, 'utf8')) : undefined;

let base;
const baseRef = option('base');
if (baseRef) {
	const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8' }).trim();
	const path = relative(repoRoot, snapshotFile);
	try {
		base = readJson(execFileSync('git', ['show', `${baseRef}:${path}`], { cwd: root, encoding: 'utf8', stdio: 'pipe' }));
	} catch {
		// Ainda não há snapshot na base: tudo aparece como novo.
		base = { version: 1, nodes: [], edges: [] };
	}
}

const write = flag('write');
const result = check(flowApp, { committed: write ? undefined : committed, base, strict: flag('strict') });

for (const issue of result.issues) {
	console.log(`${issue.severity === 'error' ? '✘' : '⚠'} ${issue.where}: ${issue.message} [${issue.code}]`);
}
const errors = result.issues.filter(issue => issue.severity === 'error').length;
console.log(`${result.graph.nodes.length} passos, ${result.graph.edges.length} transições, ${errors} erro(s), ${result.issues.length - errors} aviso(s)`);

if (write) {
	writeFileSync(snapshotFile, `${JSON.stringify(result.snapshot, null, '\t')}\n`);
	writeFileSync(
		diagramFile,
		[
			'<!-- Gerado por `npm run check -- --write`. Não editar à mão. -->',
			'',
			'# Flows',
			'',
			'`((passo))` inicial · `{{@overlay}}` overlay · `-.->` entre flows · `↩` goto.exit() · `⟲` retoma o flow · `⚙` efeito',
			'',
			'```mermaid',
			toMermaid(result.graph),
			'```',
			'',
		].join('\n')
	);
	console.log(`Atualizados ${relative(root, snapshotFile)} e ${relative(root, diagramFile)}`);
} else if (result.stale) {
	console.log(`✘ ${relative(root, snapshotFile)} está desatualizado: corre \`npm run check -- --write\` e faz commit.`);
}

if (result.report) {
	const reportFile = option('report');
	if (reportFile) writeFileSync(reportFile, `${result.report}\n`);
	else console.log(`\n${result.report}`);
}

process.exitCode = result.ok ? 0 : 1;
