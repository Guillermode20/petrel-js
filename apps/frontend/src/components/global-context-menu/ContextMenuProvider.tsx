import { createContext, type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import { logger } from "@/lib/logger";
import type {
	ContextMenuActionHandler,
	ContextMenuActionRegistry,
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

export const ContextMenuActionRegistryContext = createContext<ContextMenuActionRegistry | null>(
	null,
);

interface ContextMenuProviderProps {
	children: ReactNode;
}

function createHandlerId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
		handlerId: null,
	});

	const handlersRef = useRef<Map<string, ContextMenuActionHandler>>(new Map());

	const open = useCallback(
		(position: ContextMenuPosition, context: MenuContext, handlerId?: string) => {
			setState({
				isOpen: true,
				position,
				context,
				handlerId: handlerId ?? null,
			});
		},
		[],
	);

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

	const registry = useMemo<ContextMenuActionRegistry>(() => {
		return {
			register: (handler: ContextMenuActionHandler) => {
				const id = createHandlerId();
				handlersRef.current.set(id, handler);
				logger.debug(
					"[ContextMenu Registry] Registered handler:",
					id,
					"Total handlers:",
					handlersRef.current.size,
				);
				return id;
			},
			unregister: (handlerId: string) => {
				handlersRef.current.delete(handlerId);
				logger.debug(
					"[ContextMenu Registry] Unregistered handler:",
					handlerId,
					"Total handlers:",
					handlersRef.current.size,
				);
			},
			dispatch: async (handlerId: string, action: string, context: MenuContext, data?: unknown) => {
				logger.debug(
					"[ContextMenu Registry] Dispatch lookup:",
					handlerId,
					"Available handlers:",
					Array.from(handlersRef.current.keys()),
				);
				const handler = handlersRef.current.get(handlerId);
				if (!handler) {
					logger.warn("[ContextMenu Registry] Handler not found!");
					return false;
				}
				logger.debug("[ContextMenu Registry] Calling handler for action:", action);
				await handler(action, context, data);
				return true;
			},
		};
	}, []);

	return (
		<ContextMenuActionRegistryContext.Provider value={registry}>
			<ContextMenuActionsContext.Provider value={actions}>
				<ContextMenuStateContext.Provider value={state}>
					{children}
				</ContextMenuStateContext.Provider>
			</ContextMenuActionsContext.Provider>
		</ContextMenuActionRegistryContext.Provider>
	);
}
