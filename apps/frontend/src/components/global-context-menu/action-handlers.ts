import { useCallback, useEffect, useMemo, useContext } from "react";
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
 */
export function useRegisterContextMenuActionHandler(handler: ContextMenuActionHandler): string {
	const registry = useContextMenuActionRegistry();

	const stableHandler = useMemo<ContextMenuActionHandler>(() => handler, [handler]);
	const handlerId = useMemo<string>(() => registry.register(stableHandler), [registry, stableHandler]);

	useEffect(() => {
		return () => {
			registry.unregister(handlerId);
		};
	}, [registry, handlerId]);

	return handlerId;
}

/**
 * Returns an `onAction` callback suitable for `<GlobalContextMenu onAction={...} />`.
 *
 * It will dispatch to the currently-open menu's registered handler (if any) and then close the menu.
 */
export function useGlobalContextMenuOnAction(): (action: string, data?: unknown) => void {
	const registry = useContextMenuActionRegistry();
	const { close } = useContextMenuActions();
	const { context, handlerId } = useContextMenuState();

	return useCallback(
		(action: string, data?: unknown) => {
			if (!context) {
				close();
				return;
			}

			const run = async (currentContext: MenuContext, currentHandlerId: string | null) => {
				try {
					if (currentHandlerId) {
						await registry.dispatch(currentHandlerId, action, currentContext, data);
					}
				} finally {
					close();
				}
			};

			void run(context, handlerId);
		},
		[close, context, handlerId, registry],
	);
}

