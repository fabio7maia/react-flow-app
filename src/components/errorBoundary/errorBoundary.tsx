import React from 'react';

interface ErrorBoundaryProps {
	containerErrorMessage?: (error: string) => React.ReactNode;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error?: string | object;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: {}) {
		super(props);
		this.state = { hasError: false };
	}

	componentDidCatch(error: any, info: any): void {
		this.setState({
			...this.state,
			error,
			hasError: true,
		});
	}

	render(): React.ReactNode {
		const { containerErrorMessage } = this.props;
		const { error } = this.state;

		if (this.state.hasError) {
			return (
				(containerErrorMessage &&
					containerErrorMessage(typeof error === 'object' ? JSON.stringify(error) : error)) ||
				null
			);
		}

		return this.props.children;
	}
}
