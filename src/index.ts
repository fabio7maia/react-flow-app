/**
 * react-flow-app: event-based navigation with flows declared as data.
 *
 * Entry points:
 * - `react-flow-app`: screens, flows, the app, the headless engine, URL and browser adapters, graph
 * - `react-flow-app/react`: `FlowProvider` and hooks
 * - `react-flow-app/analytics`: GA4 and Segment adapters on top of the event contract
 * - `react-flow-app/testing`: generated paths, graph snapshot and diff (`react-flow-app check`)
 */

/**
 * Registers the app for end-to-end typing (`goto`, events, params, meta):
 *
 * ```ts
 * declare module 'react-flow-app' {
 *   interface Register {
 *     app: typeof flowApp;
 *     meta: { title: string };
 *   }
 * }
 * ```
 *
 * It is declared here (not re-exported) so the module augmentation above targets this file.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Register {}

export * from './core/types';
export * from './core/screen';
export * from './core/flow';
export * from './core/app';
export * from './core/engine';
export * from './core/graph';
export * from './core/url';
export * from './core/adapters';
