import { useCallback, useRef } from "react";
import type { ContextMenuActionHandler, MenuContext } from "@/components/global-context-menu";
import {
	useContextMenuActions as useGlobalContextMenuActions,
	useRegisterContextMenuActionHandler,
} from "@/components/global-context-menu";

interface UseContextMenuActionsReturn {
	/**
	 * Register an action handler for context menu actions
	 */
	registerHandler: (handler: ContextMenuActionHandler) => string;
	/**
	 * Dispatch an action to the registered handler
	 */
	dispatch: (action: string, context: MenuContext, data?: unknown) => void;
	/**
	 * Open the context menu at the specified position
	 */
	openContextMenu: (position: { x: number; y: number }, context: MenuContext) => void;
	/**
	 * The registered handler ID
	 */
	handlerId: string | null;
}

/**
 * Handles context menu action dispatch for the file browser.
 * Wraps the global context menu system with file-browser specific helpers.
 */
export function useContextMenuActions(): UseContextMenuActionsReturn {
	const { open: openGlobalContextMenu } = useGlobalContextMenuActions();
	const handlerRef = useRef<ContextMenuActionHandler | null>(null);
	const handlerIdRef = useRef<string | null>(null);

	const registerHandler = useCallback((handler: ContextMenuActionHandler): string => {
		handlerRef.current = handler;
		return handlerIdRef.current ?? "file-browser";
	}, []);

	const dispatch = useCallback((action: string, context: MenuContext, data?: unknown) => {
		if (handlerRef.current) {
			handlerRef.current(action, context, data);
		}
	}, []);

	const openContextMenu = useCallback(
		(position: { x: number; y: number }, context: MenuContext) => {
			openGlobalContextMenu(position, context, handlerIdRef.current ?? undefined);
		},
		[openGlobalContextMenu],
	);

	return {
		registerHandler,
		dispatch,
		openContextMenu,
		handlerId: handlerIdRef.current,
	};
}

/**
 * Hook that returns a stable handler ID for registering context menu actions.
 * This is a convenience wrapper around useRegisterContextMenuActionHandler.
 */
export function useFileBrowserContextMenuHandler(handler: ContextMenuActionHandler): string {
	return useRegisterContextMenuActionHandler(handler);
}
