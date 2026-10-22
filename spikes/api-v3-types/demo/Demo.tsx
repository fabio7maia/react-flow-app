import { type FormEvent, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
	browserHistory,
	type FlowAdapter,
	FlowProvider,
	scrollRestoration,
	toGraph,
	useFlowEngine,
	useFlowEvents,
	validateFlows,
} from 'react-flow-app';
import { appAnalytics } from '../example/analytics';
import { flowApp } from '../example/app.flow';
import { devtools, useDevtools } from './devtools';
import { Diagram } from './Diagram';
import { AnalyticsPanel, CodePanel, EventsPanel, ReviewPanel, TestsPanel } from './panels';
import { EXTERNAL_DOC, ORIGIN, SimBrowser } from './sim-browser';

const sim = new SimBrowser();
const graph = toGraph(flowApp);
const issues = validateFlows(flowApp);

/** Filho do FlowProvider: passa o engine e os eventos para os painéis (que vivem fora do Provider). */
function DevtoolsBridge({ doc, url }: { doc: number; url: string }) {
	const engine = useFlowEngine();
	// Antes do useFlowEvents: os eventos do arranque só são libertados depois dos efeitos dos filhos.
	useEffect(() => devtools.attach(engine, doc, url), [engine, doc, url]);
	useFlowEvents('*', event => devtools.event(event, doc));
	return null;
}

/** Um documento da loja: cada carregamento (deep link, reload) arranca um engine novo. */
function StoreDocument({ doc, viewport }: { doc: number; viewport: HTMLElement }) {
	const [adapters] = useState<FlowAdapter[]>(() => [
		browserHistory({ mode: 'path', browser: sim.window }),
		scrollRestoration({ get: () => viewport.scrollTop, set: top => viewport.scrollTo({ top }) }),
		appAnalytics(),
	]);
	const [url] = useState(() => sim.address);

	return (
		<FlowProvider app={flowApp} initial={{ flow: 'home' }} adapters={adapters} fallback={<p className="loading">A carregar…</p>}>
			<DevtoolsBridge doc={doc} url={url} />
		</FlowProvider>
	);
}

function ExternalPage() {
	return (
		<div className="external">
			<p className="muted">Pesquisa: loja</p>
			<a
				href={`${ORIGIN}/`}
				onClick={event => {
					event.preventDefault();
					sim.navigate('/');
				}}
			>
				<span className="external-title">Loja Exemplo</span>
				<span className="mono muted">{ORIGIN}/</span>
			</a>
			<p className="muted">Uma página de outro site, antes da loja no histórico deste separador.</p>
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
				<button type="button" className="nav-btn" aria-label="Voltar" title="Voltar" disabled={!sim.canGoBack} onClick={() => sim.back()}>
					←
				</button>
				<button type="button" className="nav-btn" aria-label="Avançar" title="Avançar" disabled={!sim.canGoForward} onClick={() => sim.forward()}>
					→
				</button>
				<button type="button" className="nav-btn" aria-label="Recarregar" title="Recarregar" disabled={doc === EXTERNAL_DOC} onClick={() => sim.reload()}>
					↻
				</button>
				<input
					id="address"
					className="address mono"
					aria-label="Endereço"
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
			<div className="history-strip" aria-label="Histórico do separador">
				{sim.entries.map((entry, index) => (
					<span key={index} className={index === sim.index ? 'hist hist-current' : 'hist'} title={entry.path}>
						{entry.doc === EXTERNAL_DOC ? 'pesquisa' : entry.path}
					</span>
				))}
			</div>
		</div>
	);
}

const TABS = [
	{ id: 'eventos', label: 'Eventos' },
	{ id: 'analytics', label: 'Analytics' },
	{ id: 'testes', label: 'Testes gerados' },
	{ id: 'revisao', label: 'Revisão de PR' },
	{ id: 'codigo', label: 'Código' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const initialTab = (): TabId => {
	const hash = typeof location !== 'undefined' ? location.hash.slice(1) : '';
	return TABS.some(tab => tab.id === hash) ? (hash as TabId) : 'eventos';
};

const TRY = [
	{ text: 'Ver carrinho → Finalizar compra → Simular falha → Tentar novamente, e depois ← do browser', why: 'volta ao carrinho: o passo de falha não fica no histórico (ignoreHistory)' },
	{ text: 'No carrinho: Entrar e comprar → Entrar', why: 'goto para o flow auth e goto.exit() de volta ao carrinho' },
	{ text: 'No pagamento: Pagar, e depois ← do browser', why: 'depois de clearHistory, o back sai da loja para a página anterior' },
	{ text: 'Escrever /checkout/pay/42 na barra', why: 'deep link para um passo que não é entrypoint: abre o carrinho' },
	{ text: 'No carrinho, descer, Finalizar compra e Voltar', why: 'a posição do scroll é reposta quando o ecrã volta a estar montado' },
];

export function Demo() {
	const state = useDevtools();
	const [tab, setTab] = useState<TabId>(initialTab);
	const current = state.snapshot?.flow && state.snapshot.step ? `${state.snapshot.flow}.${state.snapshot.step}` : null;
	const covered = useMemo(() => new Set(state.covered), [state.covered]);
	const total = useMemo(() => new Set(graph.edges.map(edge => edge.key)).size, []);
	const screen = state.snapshot?.flow && state.snapshot.step ? flowApp.getFlow(state.snapshot.flow)?.steps[state.snapshot.step]?.screen.name : undefined;

	const select = (id: TabId): void => {
		setTab(id);
		try {
			history.replaceState(null, '', `#${id}`);
		} catch {
			// Sem acesso ao histórico (pré-visualização): o separador continua a funcionar.
		}
	};

	return (
		<div className="page">
			<header className="masthead">
				<div>
					<p className="eyebrow">react-flow-app · API v3 · abordagem A</p>
					<h1>Loja Exemplo, por dentro</h1>
					<p className="lede">
						A loja do spike a correr nesta página: o motor, o adaptador do browser, o analytics e o grafo são os da implementação, não uma
						simulação. Navegue na loja e veja os eventos, o mapa dos flows e o que vai para o analytics.
					</p>
				</div>
			</header>

			<main className="layout">
				<section className="col-store" aria-label="Loja">
					<Browser />
					<div className="try">
						<h2>Experimente</h2>
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

				<section className="col-tools" aria-label="Ferramentas">
					<div className="card map-card">
						<div className="card-head">
							<h2>Mapa dos flows</h2>
							<span className={issues.length ? 'pill pill-warn' : 'pill pill-ok'}>
								{issues.length ? `${issues.length} problemas` : 'validateFlows: sem problemas'}
							</span>
						</div>
						<Diagram graph={graph} current={current} covered={covered} lastEdge={state.lastEdge} label="Mapa dos flows da loja" />
						<div className="map-foot">
							<div className="legend">
								<span className="legend-item legend-current">passo atual</span>
								<span className="legend-item legend-walked">percorrida</span>
								<span className="legend-item legend-dashed">entre flows</span>
								<span className="legend-item">◎ inicial</span>
								<span className="legend-item">↗ entrypoint</span>
								<span className="legend-item">↩ goto.exit()</span>
							</div>
							<div className="coverage-inline">
								<span className="muted">Transições percorridas nesta página</span>
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
						<div className="tabs" role="tablist" aria-label="Painéis">
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
									{item.id === 'analytics' && state.analytics.length > 0 && <span className="count">{state.analytics.length}</span>}
								</button>
							))}
						</div>
						{tab === 'eventos' && <EventsPanel log={state.log} />}
						{tab === 'analytics' && <AnalyticsPanel calls={state.analytics} />}
						{tab === 'testes' && <TestsPanel />}
						{tab === 'revisao' && <ReviewPanel />}
						{tab === 'codigo' && <CodePanel flow={state.snapshot?.flow ?? 'home'} screen={screen ?? 'dashboard'} />}
					</div>
				</section>
			</main>
		</div>
	);
}
