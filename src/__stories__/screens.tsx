import React from 'react';

export const screens = {
	screen1: {
		actions: ['skip', 'next'],
		loader: (): React.LazyExoticComponent<any> => React.lazy(() => import('./screen1')),
	},
	screen2: {
		actions: ['next'],
		loader: (): React.LazyExoticComponent<any> => React.lazy(() => import('./screen2')),
	},
	screen3: {
		actions: ['end'],
		loader: (): React.LazyExoticComponent<any> => React.lazy(() => import('./screen3')),
	},
} as const;
