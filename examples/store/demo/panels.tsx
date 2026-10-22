import { Fragment, type ReactNode, useMemo, useState } from 'react';
import { createFlowEngine, type FlowEvent, toGraph, validateFlows } from 'react-flow-app';
import { diffGraphs, getPaths } from 'react-flow-app/testing';
import { flowApp } from '../app.flow';
import { type AnalyticsCall, devtools, type LogEntry } from './devtools';
import { Diagram } from './Diagram';
import { reviewedApp } from './review';
import { type SourceFile, sourcesFor } from './sources';

const json = (value: unknown): string => (value === undefined ? '' : JSON.stringify(value));

// ─── Events ──────────────────────────────────────────────────────────────────

const detailOf = (event: FlowEvent): string => {
	switch (event.type) {
		case 'action':
			return `${event.action}${event.payload === undefined ? '' : ` ${json(event.payload)}`}${event.overlay ? ` (overlay ${event.overlay})` : ''}`;
		case 'action:unhandled':
			return event.action;
		case 'step:leave':
		case 'flow:exit':
			return event.reason;
		case 'flow:start':
			return event.source;
		case 'step:enter':
			return `${event.direction}${event.from ? ` ← ${event.from.flow}.${event.from.step}` : ''}`;
		default:
			return '';
	}
};

const summaryOf = (events: FlowEvent[]): string => {
	const action = events.find(event => event.type === 'action' || event.type === 'action:unhandled');
	if (action && 'action' in action) return `dispatch('${action.action}')`;
	if (events.some(event => event.type === 'back:empty')) return 'back() without history';
	const enter = events.find(event => event.type === 'step:enter');
	if (enter?.type === 'step:enter') {
		if (events.some(event => event.type === 'flow:start' && event.source === 'initial')) return 'start';
		return enter.direction === 'back' ? 'back()' : 'start()';
	}
	return '';
};

type Group = { key: string; kind: 'load'; url: string } | { key: string; kind: 'nav'; id: number; events: FlowEvent[] };

export function EventsPanel({ log }: { log: LogEntry[] }) {
	const groups = useMemo(() => {
		const out: Group[] = [];
		for (const entry of log) {
			if (entry.kind === 'load') {
				out.push({ key: `load-${entry.doc}-${out.length}`, kind: 'load', url: entry.url });
				continue;
			}
			const last = out[out.length - 1];
			if (last?.kind === 'nav' && last.id === entry.event.navigationId) last.events.push(entry.event);
			else
				out.push({
					key: `nav-${entry.doc}-${entry.event.navigationId}`,
					kind: 'nav',
					id: entry.event.navigationId,
					events: [entry.event],
				});
		}
		return out.reverse();
	}, [log]);

	return (
		<div className="panel-body">
			<p className="panel-note">
				The v1 event contract, as it reaches <code>useFlowEvents('*')</code>. The events of each navigation share their{' '}
				<code>navigationId</code> and always arrive in this order.
			</p>
			<ol className="nav-groups">
				{groups.map(group =>
					group.kind === 'load' ? (
						<li key={group.key} className="nav-load">
							Page loaded · <span className="mono">{group.url}</span>
						</li>
					) : (
						<li key={group.key} className="nav-group">
							<div className="nav-head">
								<span className="nav-id">#{group.id}</span>
								<span className="mono">{summaryOf(group.events)}</span>
							</div>
							<table className="events">
								<tbody>
									{group.events.map((event, index) => (
										<tr key={index}>
											<td>
												<span className={`chip chip-${event.type.replace(':', '-')}`}>{event.type}</span>
											</td>
											<td className="mono">
												{event.flow}.{event.step}
											</td>
											<td className="mono muted">{detailOf(event)}</td>
											<td className="mono muted url">{event.url}</td>
										</tr>
									))}
								</tbody>
							</table>
						</li>
					)
				)}
			</ol>
		</div>
	);
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export function AnalyticsPanel({ calls }: { calls: AnalyticsCall[] }) {
	const shown = [...calls].reverse();
	return (
		<div className="panel-body">
			<p className="panel-note">
				What the example's <code>segment()</code> adapter sends: a page view per step, flow start and exit (funnels), and only the
				actions listed in <code>analytics.ts</code>, with the fields picked from the payload.
			</p>
			{shown.length === 0 ? (
				<p className="empty">Nothing sent yet.</p>
			) : (
				<table className="events analytics">
					<tbody>
						{shown.map(call => (
							<tr key={call.id}>
								<td>
									<span className={`chip chip-${call.method}`}>{call.method}</span>
								</td>
								<td className="strong">{call.name}</td>
								<td className="mono muted">{json(pick(call))}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
}

/** For page views the path and the referrer matter; the absolute URL depends on the demo host. */
const pick = (call: AnalyticsCall): Record<string, unknown> | undefined => {
	if (call.method !== 'page' || !call.properties) return call.properties;
	const { path, referrer, flow, step } = call.properties as Record<string, string | undefined>;
	return { path, referrer: referrer?.replace(/^https?:\/\/[^/]+/, ''), flow, step };
};

// ─── Generated tests ─────────────────────────────────────────────────────────

type PathResult = {
	target: string;
	steps: Array<{ from: string; action: string; to: string; payload?: unknown }>;
	ok: boolean;
	reached: string;
};

const START = 'home.dashboard';

function runGeneratedTests(): { results: PathResult[]; covered: Set<string>; all: string[]; ms: number } {
	const started = performance.now();
	const covered = new Set<string>();
	let all: string[] = [];
	const results = getPaths(flowApp, START).map(path => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'home' } });
		for (const step of path.steps) engine.dispatch(step.action, step.payload);
		const { flow, step } = engine.getSnapshot();
		const coverage = engine.coverage();
		coverage.covered.forEach(key => covered.add(key));
		all = [...coverage.covered, ...coverage.missing];
		return { target: path.target, steps: path.steps, ok: `${flow}.${step}` === path.target, reached: `${flow}.${step}` };
	});
	return { results, covered, all, ms: performance.now() - started };
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Replays a path in the live app, step by step. */
async function replay(steps: PathResult['steps']): Promise<void> {
	const engine = devtools.engine;
	if (!engine) return;
	engine.start('home', 'dashboard' as never, { clearHistory: true });
	for (const step of steps) {
		await wait(750);
		const [flow, name] = step.to.split('.');
		const url = flowApp.getFlow(flow)?.steps[name]?.url ?? '';
		engine.dispatch(step.action, step.payload, url.includes(':orderId') ? { params: { orderId: '42' } } : undefined);
	}
}

export function TestsPanel() {
	const [run, setRun] = useState<ReturnType<typeof runGeneratedTests> | null>(null);
	const [playing, setPlaying] = useState<string | null>(null);

	const play = async (result: PathResult): Promise<void> => {
		setPlaying(result.target);
		await replay(result.steps);
		setPlaying(null);
	};

	return (
		<div className="panel-body">
			<p className="panel-note">
				One test per reachable step: the shortest path from <code>{START}</code> (<code>getPaths</code>), with the sample payloads
				declared in the <code>branch</code>es. It runs the engine without React, in memory.
			</p>
			<div className="row">
				<button type="button" className="btn" onClick={() => setRun(runGeneratedTests())}>
					{run ? 'Run again' : 'Run generated tests'}
				</button>
				{run && (
					<span className="muted">
						{run.results.filter(r => r.ok).length}/{run.results.length} passed in {run.ms.toFixed(1)} ms
					</span>
				)}
			</div>
			{run && (
				<>
					<ul className="paths">
						{run.results.map(result => (
							<li key={result.target}>
								<span className={result.ok ? 'ok' : 'fail'}>{result.ok ? '✓' : '✗'}</span>
								<span className="mono strong">{result.target}</span>
								<span className="mono muted path-steps">
									{result.steps.map((step, index) => (
										<Fragment key={index}>
											{index > 0 && ' → '}
											{step.action}
											{step.payload !== undefined && <span className="payload">{json(step.payload)}</span>}
										</Fragment>
									))}
								</span>
								<button type="button" className="btn btn-small" disabled={playing !== null} onClick={() => play(result)}>
									{playing === result.target ? 'Replaying…' : 'Replay on screen'}
								</button>
							</li>
						))}
					</ul>
					<Coverage covered={run.covered} all={run.all} />
				</>
			)}
		</div>
	);
}

function Coverage({ covered, all }: { covered: Set<string>; all: string[] }) {
	const missing = all.filter(key => !covered.has(key));
	const ratio = all.length ? covered.size / all.length : 1;
	return (
		<div className="coverage">
			<div className="coverage-head">
				<span className="strong">
					Transition coverage: {covered.size}/{all.length}
				</span>
				<span className="muted">{Math.round(ratio * 100)}%</span>
			</div>
			<div className="bar" role="progressbar" aria-valuenow={Math.round(ratio * 100)} aria-valuemin={0} aria-valuemax={100}>
				<span style={{ width: `${ratio * 100}%` }} />
			</div>
			{missing.length > 0 && (
				<>
					<p className="panel-note">
						Not covered (the shortest paths do not go through these; the report says what is left to write by hand):
					</p>
					<ul className="missing">
						{missing.map(key => (
							<li key={key} className="mono">
								{key}
							</li>
						))}
					</ul>
				</>
			)}
		</div>
	);
}

// ─── PR review ───────────────────────────────────────────────────────────────

export function ReviewPanel() {
	const before = useMemo(() => toGraph(flowApp), []);
	const after = useMemo(() => toGraph(reviewedApp), []);
	const diff = useMemo(() => diffGraphs(before, after), [before, after]);
	const issues = useMemo(() => validateFlows(reviewedApp), []);
	const list = (title: string, items: ReactNode[]) =>
		items.length > 0 && (
			<div>
				<h4>{title}</h4>
				<ul className="diff-list">{items}</ul>
			</div>
		);

	return (
		<div className="panel-body">
			<p className="panel-note">
				A PR adds a review step before the payment. <code>react-flow-app check --base origin/main</code> compares the graph snapshot
				with the one on the base branch and puts this summary on the PR.
			</p>
			<div className="legend">
				<span className="legend-item legend-added">new</span>
				<span className="legend-item legend-removed">removed</span>
				<span className="legend-item legend-changed">changed</span>
			</div>
			<Diagram
				graph={after}
				diff={diff}
				removedEdges={diff.removedEdges}
				removedNodes={diff.removedNodes}
				label="Graph diff in the PR"
			/>
			<div className="diff-columns">
				{list(
					'New steps',
					diff.addedNodes.map(node => (
						<li key={node.id} className="mono">
							+ {node.id}
						</li>
					))
				)}
				{list(
					'Changed steps',
					diff.changedNodes.map(node => (
						<li key={node.id}>
							<span className="mono">~ {node.id}</span> {node.changes.join('; ')}
						</li>
					))
				)}
				{list(
					'New transitions',
					diff.addedEdges.map(edge => (
						<li key={edge.id} className="mono">
							+ {edge.from} —{edge.action}→ {edge.to}
						</li>
					))
				)}
				{list(
					'Removed transitions',
					diff.removedEdges.map(edge => (
						<li key={edge.id} className="mono">
							− {edge.from} —{edge.action}→ {edge.to}
						</li>
					))
				)}
			</div>
			<p className="muted">
				Validation: {issues.filter(issue => issue.severity === 'error').length} errors,{' '}
				{issues.filter(issue => issue.severity === 'warning').length} warnings.
			</p>
		</div>
	);
}

// ─── Code ────────────────────────────────────────────────────────────────────

const TOKEN =
	/(\/\/.*$|\/\*[\s\S]*?\*\/)|('(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(import|from|export|const|function|return|declare|module|interface|default|if|async|await)\b|\b(defineScreen|defineFlow|transitions|goto|branch|payload|createFlowApp|useFlow|useStepParams|segment)\b/gm;

function highlight(code: string): ReactNode[] {
	const out: ReactNode[] = [];
	let last = 0;
	for (const match of code.matchAll(TOKEN)) {
		const index = match.index ?? 0;
		if (index > last) out.push(code.slice(last, index));
		const kind = match[1] ? 'tok-comment' : match[2] ? 'tok-string' : match[3] ? 'tok-keyword' : 'tok-api';
		out.push(
			<span key={index} className={kind}>
				{match[0]}
			</span>
		);
		last = index + match[0].length;
	}
	out.push(code.slice(last));
	return out;
}

export function CodePanel({ flow, screen }: { flow: string; screen: string }) {
	const files: SourceFile[] = sourcesFor(flow, screen);
	const [selected, setSelected] = useState(0);
	const file = files[Math.min(selected, files.length - 1)];

	return (
		<div className="panel-body">
			<p className="panel-note">
				The files that define the current screen. Each screen has its definition and its component; navigation lives in the flow
				file.
			</p>
			<div className="file-tabs" role="tablist" aria-label="Files">
				{files.map((candidate, index) => (
					<button
						key={candidate.path}
						type="button"
						role="tab"
						aria-selected={candidate === file}
						className={candidate === file ? 'file-tab active' : 'file-tab'}
						onClick={() => setSelected(index)}
					>
						{candidate.path}
					</button>
				))}
			</div>
			<pre className="code">
				<code>{highlight(file.code.trimEnd())}</code>
			</pre>
		</div>
	);
}
