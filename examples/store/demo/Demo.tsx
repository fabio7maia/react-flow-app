import { type FormEvent, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { browserHistory, type FlowAdapter, scrollRestoration, toGraph, validateFlows } from 'react-flow-app';
import { FlowProvider, useFlowEngine, useFlowEvents } from 'react-flow-app/react';
import { appAnalytics } from '../analytics';
import { flowApp } from '../app.flow';
import { devtools, useDevtools } from './devtools';
import { Diagram } from './Diagram';
import { AnalyticsPanel, CodePanel, EventsPanel, ReviewPanel, TestsPanel } from './panels';
import { EXTERNAL_DOC, ORIGIN, SimBrowser } from './sim-browser';

const sim = new SimBrowser();
const graph = toGraph(flowApp);
const issues = validateFlows(flowApp);

/** Child of the FlowProvider: hands the engine and the events to the panels (which live outside the Provider). */
function DevtoolsBridge({ doc, url }: { doc: number; url: string }) {
	const engine = useFlowEngine();
	// Before useFlowEvents: the start events are only released after the children's effects.
	useEffect(() => devtools.attach(engine, doc, url), [engine, doc, url]);
	useFlowEvents('*', event => devtools.event(event, doc));
	return null;
}

/** A document of the store: each load (deep link, reload) starts a new engine. */
function StoreDocument({ doc, viewport }: { doc: number; viewport: HTMLElement }) {
	const [adapters] = useState<FlowAdapter[]>(() => [
		browserHistory({ mode: 'path', browser: sim.window }),
		scrollRestoration({ get: () => viewport.scrollTop, set: top => viewport.scrollTo({ top }) }),
		appAnalytics(),
	]);
	const [url] = useState(() => sim.address);

	return (
		<FlowProvider app={flowApp} initial={{ flow: 'home' }} adapters={adapters} fallback={<p className="loading">Loading…</p>}>
			<DevtoolsBridge doc={doc} url={url} />
		</FlowProvider>
	);
}

function ExternalPage() {
	return (
		<div className="external">
			<p className="muted">Search: store</p>
			<a
				href={`${ORIGIN}/`}
				onClick={event => {
					event.preventDefault();
					sim.navigate('/');
				}}
			>
				<span className="external-title">Example Store</span>
				<span className="mono muted">{ORIGIN}/</span>
			</a>
			<p className="muted">A page of another site, before the store in this tab's history.</p>
		</div>
	);
}

function Browser() {
	useSyncExternalStore(sim.subscribe, sim.getVersion);
	const viewportRef = useRef<HTMLDivElement>(null);
	const [viewport, setViewport] = useState<HTMLElement | null>(null);
	const [draft, setDraft] = useState<string | null>(null);
	const doc = sim.doc;

	useEffect(() => setViewport(viewportRef.current), []);

	const submit = (event: FormEvent): void => {
		event.preventDefault();
		const value = (draft ?? sim.address).trim();
		setDraft(null);
		const path = value.startsWith(ORIGIN) ? value.slice(ORIGIN.length) || '/' : value.startsWith('/') ? value : `/${value}`;
		sim.navigate(path);
	};

	return (
		<div className="browser">
			<form className="browser-bar" onSubmit={submit}>
				<button
					type="button"
					className="nav-btn"
					aria-label="Back"
					title="Back"
					disabled={!sim.canGoBack}
					onClick={() => sim.back()}
				>
					←
				</button>
				<button
					type="button"
					className="nav-btn"
					aria-label="Forward"
					title="Forward"
					disabled={!sim.canGoForward}
					onClick={() => sim.forward()}
				>
					→
				</button>
				<button
					type="button"
					className="nav-btn"
					aria-label="Reload"
					title="Reload"
					disabled={doc === EXTERNAL_DOC}
					onClick={() => sim.reload()}
				>
					↻
				</button>
				<input
					id="address"
					className="address mono"
					aria-label="Address"
					value={draft ?? sim.address}
					onChange={event => setDraft(event.target.value)}
					onFocus={event => event.target.select()}
					onBlur={() => setDraft(null)}
					spellCheck={false}
				/>
			</form>
			<div className="viewport" ref={viewportRef}>
				{doc === EXTERNAL_DOC ? <ExternalPage /> : viewport && <StoreDocument key={doc} doc={doc} viewport={viewport} />}
			</div>
			<div className="history-strip" aria-label="Tab history">
				{sim.entries.map((entry, index) => (
					<span key={index} className={index === sim.index ? 'hist hist-current' : 'hist'} title={entry.path}>
						{entry.doc === EXTERNAL_DOC ? 'search' : entry.path}
					</span>
				))}
			</div>
		</div>
	);
}

const TABS = [
	{ id: 'events', label: 'Events' },
	{ id: 'analytics', label: 'Analytics' },
	{ id: 'tests', label: 'Generated tests' },
	{ id: 'review', label: 'PR review' },
	{ id: 'code', label: 'Code' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const initialTab = (): TabId => {
	const hash = typeof location !== 'undefined' ? location.hash.slice(1) : '';
	return TABS.some(tab => tab.id === hash) ? (hash as TabId) : 'events';
};

const TRY = [
	{
		text: 'View cart → Checkout → Simulate failure → Try again, then the browser ←',
		why: 'back to the cart: the failure step is not kept in the history (ignoreHistory)',
	},
	{ text: 'On the cart: Log in and buy → Log in', why: 'goto to the auth flow and goto.exit() back to the cart' },
	{ text: 'On the payment: Pay, then the browser ←', why: 'after clearHistory, back leaves the store for the previous page' },
	{ text: 'Type /checkout/pay/42 in the address bar', why: 'deep link to a step that is not an entrypoint: opens the cart' },
	{ text: 'On the cart, scroll down, Checkout, then Back', why: 'the scroll position is restored once the screen is mounted again' },
];

export function Demo() {
	const state = useDevtools();
	const [tab, setTab] = useState<TabId>(initialTab);
	const current = state.snapshot?.flow && state.snapshot.step ? `${state.snapshot.flow}.${state.snapshot.step}` : null;
	const covered = useMemo(() => new Set(state.covered), [state.covered]);
	const total = useMemo(() => new Set(graph.edges.map(edge => edge.key)).size, []);
	const screen =
		state.snapshot?.flow && state.snapshot.step
			? flowApp.getFlow(state.snapshot.flow)?.steps[state.snapshot.step]?.screen.name
			: undefined;

	const select = (id: TabId): void => {
		setTab(id);
		try {
			history.replaceState(null, '', `#${id}`);
		} catch {
			// No history access (preview): the tab still works.
		}
	};

	return (
		<div className="page">
			<header className="masthead">
				<div>
					<p className="eyebrow">react-flow-app · API v3 · abordagem A</p>
					<h1>Inside the Example Store</h1>
					<p className="lede">
						The example store running on this page: the engine, the browser adapter, analytics and the graph are the library
						itself, not a mock. Browse the store and watch the events, the map of the flows and what goes to analytics.
					</p>
				</div>
			</header>

			<main className="layout">
				<section className="col-store" aria-label="Store">
					<Browser />
					<div className="try">
						<h2>Try it</h2>
						<ul>
							{TRY.map(item => (
								<li key={item.text}>
									<span className="strong">{item.text}</span>
									<span className="muted">{item.why}</span>
								</li>
							))}
						</ul>
					</div>
				</section>

				<section className="col-tools" aria-label="Tools">
					<div className="card map-card">
						<div className="card-head">
							<h2>Map of the flows</h2>
							<span className={issues.length ? 'pill pill-warn' : 'pill pill-ok'}>
								{issues.length ? `${issues.length} issues` : 'validateFlows: no issues'}
							</span>
						</div>
						<Diagram
							graph={graph}
							current={current}
							covered={covered}
							lastEdge={state.lastEdge}
							label="Map of the store flows"
						/>
						<div className="map-foot">
							<div className="legend">
								<span className="legend-item legend-current">current step</span>
								<span className="legend-item legend-walked">walked</span>
								<span className="legend-item legend-dashed">between flows</span>
								<span className="legend-item">◎ initial</span>
								<span className="legend-item">↗ entrypoint</span>
								<span className="legend-item">↩ goto.exit()</span>
							</div>
							<div className="coverage-inline">
								<span className="muted">Transitions walked on this page</span>
								<span className="strong tabular">
									{covered.size}/{total}
								</span>
								<div className="bar bar-small">
									<span style={{ width: `${(covered.size / total) * 100}%` }} />
								</div>
							</div>
						</div>
					</div>

					<div className="card tabs-card">
						<div className="tabs" role="tablist" aria-label="Panels">
							{TABS.map(item => (
								<button
									key={item.id}
									type="button"
									role="tab"
									id={`tab-${item.id}`}
									aria-selected={tab === item.id}
									className={tab === item.id ? 'tab active' : 'tab'}
									onClick={() => select(item.id)}
								>
									{item.label}
									{item.id === 'analytics' && state.analytics.length > 0 && (
										<span className="count">{state.analytics.length}</span>
									)}
								</button>
							))}
						</div>
						{tab === 'events' && <EventsPanel log={state.log} />}
						{tab === 'analytics' && <AnalyticsPanel calls={state.analytics} />}
						{tab === 'tests' && <TestsPanel />}
						{tab === 'review' && <ReviewPanel />}
						{tab === 'code' && <CodePanel flow={state.snapshot?.flow ?? 'home'} screen={screen ?? 'dashboard'} />}
					</div>
				</section>
			</main>
		</div>
	);
}
