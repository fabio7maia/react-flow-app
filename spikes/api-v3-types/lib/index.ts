/**
 * Protótipo da API v3 (spike). Não é código de produção.
 *
 * `Register` é declarado aqui (e não reexportado) para que a augmentation
 * `declare module 'react-flow-app' { interface Register { ... } }` funcione.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Register {}

export * from './types';
export * from './screen';
export * from './flow';
export * from './app';
export * from './engine';
export * from './graph';
export * from './url';
export * from './adapters';
export * from './react';
