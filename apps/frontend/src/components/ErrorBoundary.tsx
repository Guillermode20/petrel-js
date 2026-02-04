import { Component, type ErrorInfo, type ReactNode } from "react";
import { logger } from "../lib/logger";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	public override state: State = {
		hasError: false,
		error: null,
	};

	public static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		logger.error("Uncaught error in React component tree", {
			error: error.message,
			stack: error.stack,
			componentStack: errorInfo.componentStack,
		});
	}

	public override render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-950 text-zinc-100 p-4">
					<div className="max-w-md w-full space-y-4 text-center">
						<h2 className="text-2xl font-bold text-red-500">Something went wrong</h2>
						<p className="text-zinc-400">
							An unexpected error occurred. The technical details have been logged automatically.
						</p>
						<div className="bg-zinc-900 p-4 rounded-md overflow-auto text-left text-xs font-mono max-h-64 border border-zinc-800">
							<p className="text-red-400 mb-2">{this.state.error?.message}</p>
							{this.state.error?.stack && (
								<pre className="text-zinc-500 whitespace-pre-wrap">{this.state.error.stack}</pre>
							)}
						</div>
						<button
							onClick={() => window.location.reload()}
							className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded-md font-medium hover:bg-white transition-colors"
						>
							Reload Application
						</button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}