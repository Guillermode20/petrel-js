import { useCallback, useEffect, useRef, useContext } from "react";
import { ContextMenuActionRegistryContext } from "./ContextMenuProvider";
import type { ContextMenuActionHandler, MenuContext } from "./types";
import { useContextMenuActions, useContextMenuState } from "./useContextMenu";

function useContextMenuActionRegistry() {
	const registry = useContext(ContextMenuActionRegistryContext);
	if (!registry) {
		throw new Error("useContextMenuActionRegistry must be used within a ContextMenuProvider");
	}
	return registry;
}

/**
 * Registers a handler and returns a stable handlerId to pass into `open(..., handlerId)`.
 * 
 * The handlerId remains stable across re-renders - only the handler reference is updated.
 * This ensures the context menu can still dispatch to the correct handler even if the
 * component re-renders while the menu is open.
 */
export function useRegisterContextMenuActionHandler(handler: ContextMenuActionHandler): string {
	const registry = useContextMenuActionRegistry();
	const handlerRef = useRef<ContextMenuActionHandler>(handler);

	// Always keep the handler ref up to date so the wrapper calls the latest version
	handlerRef.current = handler;

	// Create a stable wrapper once that delegates to the ref
	// Also register synchronously to get a stable ID immediately
	const registrationRef = useRef<{ id: string; registered: boolean } | null>(null);
	if (registrationRef.current === null) {
		const wrapper: ContextMenuActionHandler = (action, context, data) => {
			return handlerRef.current(action, context, data);
		};
		const id = registry.register(wrapper);
		registrationRef.current = { id, registered: true };
	} else if (!registrationRef.current.registered) {
		// Re-register after unmount (React Strict Mode)
		const wrapper: ContextMenuActionHandler = (action, context, data) => {
			return handlerRef.current(action, context, data);
		};
		// Use a new ID since the old one was unregistered
		registrationRef.current.id = registry.register(wrapper);
		registrationRef.current.registered = true;
	}

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (registrationRef.current) {
				registry.unregister(registrationRef.current.id);
				registrationRef.current.registered = false;
			}
		};
	}, [registry]);

	return registrationRef.current.id;
}

/**
 * Returns an `onAction` callback suitable for `<GlobalContextMenu onAction={...} />`.
 *
 * It will dispatch to the currently-open menu's registered handler (if any) and then close the menu.
 * 
 * Uses refs to ensure we always dispatch with the latest context/handlerId values,
 * avoiding stale closure issues that can occur with useCallback.
 */
export function useGlobalContextMenuOnAction(): (action: string, data?: unknown) => void {
	const registry = useContextMenuActionRegistry();
	const { close } = useContextMenuActions();
	const state = useContextMenuState();

	// Keep refs updated to the latest values to avoid stale closure issues
	const stateRef = useRef(state);
	stateRef.current = state;

	const closeRef = useRef(close);
	closeRef.current = close;

	const registryRef = useRef(registry);
	registryRef.current = registry;

	// Return a stable callback that always reads from refs
	return useCallback(
		(action: string, data?: unknown) => {
			const { context, handlerId } = stateRef.current;
			console.log("[ContextMenu] onAction called:", { action, data, context, handlerId });
			
			if (!context) {
				console.log("[ContextMenu] No context, closing");
				closeRef.current();
				return;
			}

			const run = async (currentContext: MenuContext, currentHandlerId: string | null) => {
				try {
					if (currentHandlerId) {
						console.log("[ContextMenu] Dispatching to handler:", currentHandlerId);
						const dispatched = await registryRef.current.dispatch(currentHandlerId, action, currentContext, data);
						console.log("[ContextMenu] Dispatch result:", dispatched);
					} else {
						console.log("[ContextMenu] No handlerId to dispatch to");
					}
				} finally {
					closeRef.current();
				}
			};

			void run(context, handlerId);
		},
		[], // Stable callback - reads from refs
	);
}

