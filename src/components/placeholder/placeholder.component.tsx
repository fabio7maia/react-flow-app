import React from 'react';
import { useLogger } from '../../hooks';
import './placeholder.styles.css';

export interface PlaceholderProps {
	loading: boolean;
	style?: React.CSSProperties;
}

export const Placeholder = ({ children, loading }: React.PropsWithChildren<PlaceholderProps>) => {
	const { log } = useLogger('components');

	log('Placeholder > render', { loading });

	return (
		<>
			{loading && (
				<div className="placeholder-load-wrapper">
					<div className="placeholder-activity"></div>
				</div>
			)}
			{!loading && <>{children}</>}
		</>
	);
};
