import { useCallback, useContext, useRef } from "react";
import { ContextMenuActionsContext, ContextMenuStateContext } from "./ContextMenuProvider";
import type { ContextMenuPosition, MenuContext } from "./types";

/**
 * Hook to access context menu state
 */
export function useContextMenuState() {
	const state = useContext(ContextMenuStateContext);
	if (!state) {
		throw new Error("useContextMenuState must be used within a ContextMenuProvider");
	}
	return state;
}

/**
 * Hook to access context menu actions
 */
export function useContextMenuActions() {
	const actions = useContext(ContextMenuActionsContext);
	if (!actions) {
		throw new Error("useContextMenuActions must be used within a ContextMenuProvider");
	}
	return actions;
}

/**
 * Combined hook for context menu state and actions
 */
export function useContextMenu() {
	const state = useContextMenuState();
	const actions = useContextMenuActions();
	return { ...state, ...actions };
}

/**
 * Long press detection threshold in milliseconds
 */
const LONG_PRESS_THRESHOLD = 500;

/**
 * Hook for handling long-press to open context menu on mobile
 *
 * Returns handlers to attach to elements for touch-based context menu triggering.
 */
export function useLongPress(context: MenuContext) {
	const actions = useContextMenuActions();
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const positionRef = useRef<ContextMenuPosition>({ x: 0, y: 0 });

	const handleTouchStart = useCallback(
		(e: React.TouchEvent) => {
			const touch = e.touches[0];
			if (!touch) return;
			positionRef.current = { x: touch.clientX, y: touch.clientY };

			timerRef.current = setTimeout(() => {
				actions.open(positionRef.current, context);
			}, LONG_PRESS_THRESHOLD);
		},
		[actions, context],
	);

	const handleTouchMove = useCallback((e: React.TouchEvent) => {
		// Cancel if user moves finger significantly
		const touch = e.touches[0];
		if (!touch) return;
		const dx = Math.abs(touch.clientX - positionRef.current.x);
		const dy = Math.abs(touch.clientY - positionRef.current.y);

		if (dx > 10 || dy > 10) {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
		}
	}, []);

	const handleTouchEnd = useCallback(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	const handleContextMenu = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			actions.open({ x: e.clientX, y: e.clientY }, context);
		},
		[actions, context],
	);

	return {
		onTouchStart: handleTouchStart,
		onTouchMove: handleTouchMove,
		onTouchEnd: handleTouchEnd,
		onTouchCancel: handleTouchEnd,
		onContextMenu: handleContextMenu,
	};
}
