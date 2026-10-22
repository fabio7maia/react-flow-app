import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{
		ignores: ['dist', 'coverage', '.demo', '.e2e', '.bench', '.smoke', 'node_modules'],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		plugins: { 'react-hooks': reactHooks },
		rules: reactHooks.configs.recommended.rules,
	},
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_', ignoreRestSiblings: true },
			],
			'no-console': ['warn', { allow: ['warn', 'error'] }],
		},
	},
	{
		// The CLI, scripts and tests print on purpose.
		files: ['src/cli/**', 'scripts/**', 'e2e/**', 'test/**'],
		rules: { 'no-console': 'off' },
	}
);
