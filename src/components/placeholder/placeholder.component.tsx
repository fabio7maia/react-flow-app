import React from 'react';
import { useLogger } from '@hooks';
import './placeholder.styles.css';

export interface PlaceholderProps {
	loading: boolean;
	style?: React.CSSProperties;
}

export const Placeholder: React.FC<PlaceholderProps> = ({ children, loading }) => {
	const { log } = useLogger('components');

	log('Placeholder > render', { loading });

	return (
		<>
			{loading && (
				<div className="placeholder-load-wraper">
					<div className="placeholder-activity"></div>
				</div>
			)}
			{!loading && <>{children}</>}
		</>
	);
};
