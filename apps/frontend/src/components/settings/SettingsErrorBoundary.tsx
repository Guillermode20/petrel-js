import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Props {
	children: ReactNode;
	sectionName?: string;
	onRetry?: () => void;
}

interface State {
	hasError: boolean;
	error: Error | null;
	errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary for settings components
 * Catches persistence failures and provides recovery options
 */
export class SettingsErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null, errorInfo: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error, errorInfo: null };
	}

	override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error(`Settings Error [${this.props.sectionName || "unknown"}]:`, error, errorInfo);
		this.setState({ error, errorInfo });
	}

	handleRetry = () => {
		this.setState({ hasError: false, error: null, errorInfo: null });
		this.props.onRetry?.();
	};

	handleReload = () => {
		window.location.reload();
	};

	override render() {
		if (this.state.hasError) {
			return (
				<div className="p-6 space-y-4">
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertTitle>Settings Failed to Load</AlertTitle>
						<AlertDescription className="space-y-4">
							<p>
								We encountered an error while loading your settings
								{this.props.sectionName ? ` for ${this.props.sectionName}` : ""}.
							</p>
							{this.state.error && (
								<details className="text-xs opacity-80">
									<summary>Technical details</summary>
									<code className="block mt-2 p-2 bg-black/10 rounded">
										{this.state.error.message}
									</code>
								</details>
							)}
						</AlertDescription>
					</Alert>

					<div className="flex gap-2">
						<Button onClick={this.handleRetry} variant="outline">
							<RefreshCw className="h-4 w-4 mr-2" />
							Try Again
						</Button>
						<Button onClick={this.handleReload} variant="secondary">
							Reload Page
						</Button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

/**
 * Hook to handle settings persistence errors with automatic retry
 */
export function useSettingsErrorHandler(maxRetries = 3) {
	let retryCount = 0;

	return {
		canRetry: () => retryCount < maxRetries,
		incrementRetry: () => {
			retryCount++;
		},
		resetRetry: () => {
			retryCount = 0;
		},
		getRetryCount: () => retryCount,
	};
}
