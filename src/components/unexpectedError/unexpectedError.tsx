import React from 'react';
import { useLoggerFlow } from '../../hooks';

interface UnexpectedErrorProps {
	error: string; // injected by ErrorBoundary component
}

export const UnexpectedError: React.FC<UnexpectedErrorProps> = ({ error }) => {
	const logger = useLoggerFlow();

	React.useEffect(() => {
		logger.error('UnexpectedError', { error });
	}, []);

	return <h1>Pedimos desculpa, mas de momento não podemos satisfazer o seu pedido!</h1>;
};
