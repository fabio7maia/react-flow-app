module.exports = {
	parser: '@typescript-eslint/parser', // Specifies the ESLint parser
	extends: [
		'plugin:@typescript-eslint/recommended',
		'react-app',
		'plugin:prettier/recommended',
		'plugin:sonarjs/recommended',
	],
	plugins: ['@typescript-eslint', 'react', 'sonarjs'],
	parserOptions: {
		ecmaVersion: 6, // Allows for the parsing of modern ECMAScript features
		sourceType: 'module', // Allows for the use of imports
	},
	rules: {
		indent: 'off',
		'no-undef': 'off',
		'@typescript-eslint/indent': 'off',
		'no-unused-vars': 'off',
		'default-case': 'off',
		'@typescript-eslint/no-use-before-define': 'off',
		'no-console': 'warn',
		'no-debugger': 'warn',
	},
	settings: {
		react: {
			version: 'detect', // Tells eslint-plugin-react to automatically detect the version of React to use
		},
	},
};
