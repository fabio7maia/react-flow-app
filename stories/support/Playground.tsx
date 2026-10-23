import { type ReactNode, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { type FlowAdapter, type FlowApp, type FlowEvent, toGraph } from 'react-flow-app';
import { FlowProvider, useFlowEngine, useFlowEvents, useFlowSelector } from 'react-flow-app/react';
import { Diagram } from '../../examples/store/demo/Diagram';

type PlaygroundProps = {
	app: FlowApp;
	initial: { flow: string; step?: string };
	adapters?: FlowAdapter[];
	/** What to try in this example. */
	hints?: ReactNode;
	/** Extra panel under the inspector (e.g. the analytics calls). */
	aside?: ReactNode;
};

const detailOf = (event: FlowEvent): string => {
	switch (event.type) {
		case 'action':
			return `${event.action}${event.payload === undefined ? '' : ` ${JSON.stringify(event.payload)}`}`;
		case 'action:unhandled':
			return event.action;
		case 'step:leave':
		case 'flow:exit':
			return event.reason;
		case 'flow:start':
			return event.source;
		case 'step:enter':
			return event.direction;
		default:
			return '';
	}
};

/** Lives inside the FlowProvider (it needs the engine) and renders next to the screen through a portal. */
function Inspector({ app, target }: { app: FlowApp; target: HTMLElement }) {
	const engine = useFlowEngine();
	const flow = useFlowSelector(snapshot => snapshot.flow);
	const step = useFlowSelector(snapshot => snapshot.step);
	const history = useFlowSelector(snapshot => snapshot.history);
	const [events, setEvents] = useState<FlowEvent[]>([]);
	const [covered, setCovered] = useState<ReadonlySet<string>>(new Set());
	const graph = useMemo(() => toGraph(app), [app]);

	useFlowEvents('*', event => {
		setEvents(list => [event as FlowEvent, ...list].slice(0, 40));
		setCovered(new Set(engine.coverage().covered));
	});

	return createPortal(
		<div className="pg-inspector">
			<div className="pg-state">
				<div>
					<span className="pg-label">Current step</span>
					<span className="mono strong">
						{flow}.{step}
					</span>
				</div>
				<div>
					<span className="pg-label">History</span>
					<span className="pg-history">
						{history.length === 0 ? (
							<span className="muted">empty</span>
						) : (
							history.map((entry, index) => (
								<span key={index} className="hist">
									{entry.flow}.{entry.step}
								</span>
							))
						)}
					</span>
				</div>
				<button type="button" className="btn btn-small" onClick={() => engine.back()}>
					engine.back()
				</button>
			</div>
			<Diagram graph={graph} current={flow && step ? `${flow}.${step}` : null} covered={covered} label="Flow map" />
			<table className="events">
				<tbody>
					{events.map((event, index) => (
						<tr key={`${event.navigationId}-${index}`}>
							<td className="mono muted">#{event.navigationId}</td>
							<td>
								<span className={`chip chip-${event.type.replace(':', '-')}`}>{event.type}</span>
							</td>
							<td className="mono">
								{event.flow}.{event.step}
							</td>
							<td className="mono muted">{detailOf(event)}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>,
		target
	);
}

/**
 * A FlowProvider with an inspector: current step, history, flow map with the walked transitions,
 * and the event log. The screens of each example are ordinary components.
 */
export function Playground({ app, initial, adapters = [], hints, aside }: PlaygroundProps) {
	const [target, setTarget] = useState<HTMLElement | null>(null);

	return (
		<div className="pg">
			<div className="pg-main">
				<div className="browser">
					<div className="viewport">
						<FlowProvider
							app={app as never}
							initial={initial as never}
							adapters={adapters}
							fallback={<p className="loading">Loading…</p>}
						>
							{target && <Inspector app={app} target={target} />}
						</FlowProvider>
					</div>
				</div>
				{hints && <div className="pg-hints">{hints}</div>}
				{aside}
			</div>
			<div className="pg-side card" ref={setTarget} />
		</div>
	);
}

/** A screen component for examples: a title, an optional text and buttons. */
export function ScreenCard({ title, children, text }: { title: string; text?: ReactNode; children?: ReactNode }) {
	return (
		<>
			<h1>{title}</h1>
			{text && <p className="muted">{text}</p>}
			{children}
		</>
	);
}
