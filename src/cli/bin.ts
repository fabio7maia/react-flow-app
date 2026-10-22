#!/usr/bin/env node
import { main } from './index';

main(process.argv.slice(2)).then(
	code => {
		process.exitCode = code;
	},
	(error: unknown) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	}
);
