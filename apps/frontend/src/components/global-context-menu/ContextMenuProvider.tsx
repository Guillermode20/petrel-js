import { createContext, useCallback, useState, type ReactNode } from "react";
import type {
	ContextMenuActions,
	ContextMenuPosition,
	ContextMenuState,
	MenuContext,
} from "./types";

/**
 * Context for the global context menu state
 */
export const ContextMenuStateContext = createContext<ContextMenuState | null>(null);

/**
 * Context for the global context menu actions
 */
export const ContextMenuActionsContext = createContext<ContextMenuActions | null>(null);

interface ContextMenuProviderProps {
	children: ReactNode;
}

/**
 * Global context menu provider
 *
 * Manages state for programmatically opening context menus from anywhere in the app.
 * Used for mobile long-press, keyboard shortcuts, and custom triggers.
 */
export function ContextMenuProvider({ children }: ContextMenuProviderProps): ReactNode {
	const [state, setState] = useState<ContextMenuState>({
		isOpen: false,
		position: { x: 0, y: 0 },
		context: null,
	});

	const open = useCallback((position: ContextMenuPosition, context: MenuContext) => {
		setState({
			isOpen: true,
			position,
			context,
		});
	}, []);

	const close = useCallback(() => {
		setState((prev) => ({
			...prev,
			isOpen: false,
		}));
	}, []);

	const actions: ContextMenuActions = {
		open,
		close,
	};

	return (
		<ContextMenuActionsContext.Provider value={actions}>
			<ContextMenuStateContext.Provider value={state}>
				{children}
			</ContextMenuStateContext.Provider>
		</ContextMenuActionsContext.Provider>
	);
}
