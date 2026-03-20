import type { InferredScreens, ScreenConfig } from "../types/core";

/**
 * Factory function to define screens with full TypeScript inference.
 *
 * Each screen can carry a `meta` object with arbitrary fields (url, title,
 * analytics labels, …). The metadata is automatically forwarded to every
 * `useFlowListener` event for that screen, so integrations such as Google
 * Analytics can be wired up in one place without coupling individual screens
 * to tracking code.
 *
 * @example
 * ```ts
 * const screens = defineScreens({
 *   login: {
 *     actions: ['submit', 'forgotPassword'] as const,
 *     loader: () => import('./LoginScreen'),
 *     meta: {
 *       url: '/auth/login',
 *       title: 'Login',
 *       analyticsCategory: 'auth',
 *     },
 *   },
 *   dashboard: {
 *     actions: ['logout', 'settings'] as const,
 *     loader: () => import('./DashboardScreen'),
 *     meta: { url: '/dashboard', title: 'Dashboard' },
 *   },
 * });
 *
 * // In your analytics integration:
 * useFlowListener('all', (event) => {
 *   // Page view — fires on every mount / back navigation
 *   if (event.meta?.url) {
 *     gtag('config', 'GA_ID', {
 *       page_path:  event.meta.url,
 *       page_title: event.meta.title,
 *     });
 *   }
 *
 *   // Custom event — fires on dispatch with the action payload
 *   if (event.type === 'dispatch') {
 *     gtag('event', event.action, {
 *       event_category: event.meta?.analyticsCategory ?? 'navigation',
 *       ...event.payload,        // ← payload from dispatch('action', payload)
 *     });
 *   }
 * });
 * ```
 */
export function defineScreens<TConfig extends Record<string, ScreenConfig>>(
	config: TConfig
): InferredScreens<TConfig> {
	const result = {} as InferredScreens<TConfig>;

	for (const [name, screenConfig] of Object.entries(config)) {
		(result as Record<string, unknown>)[name] = {
			...screenConfig,
			name,
			__brand: "Screen" as const,
		};
	}

	return result;
}
