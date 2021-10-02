export interface Logger {
	error?: boolean;
	log?: boolean;
	warn?: boolean;
}

export type LoggerType = keyof Logger;
