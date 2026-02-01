import { useEffect, useRef } from "react";
import { useContextMenuActions } from "./useContextMenu";
import type { ContextMenuPosition, MenuContext } from "./types";

export interface UseContextMenuKeyboardShortcutsOptions {
	disabled?: boolean;
	getContext: () => { context: MenuContext; handlerId?: string } | null;
}

function isTypingTarget(target: EventTarget | null): boolean {
	return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

function getAnchorPositionFromActiveElement(activeElement: Element | null): ContextMenuPosition | null {
	if (!(activeElement instanceof HTMLElement)) return null;
	const rect = activeElement.getBoundingClientRect();
	if (rect.width === 0 && rect.height === 0) return null;
	return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/**
 * Opens the global context menu via keyboard:
 * - ContextMenu/Menu key
 * - Shift+F10
 *
 * The caller provides the current `MenuContext` and an optional `handlerId`.
 */
export function useContextMenuKeyboardShortcuts({
	disabled = false,
	getContext,
}: UseContextMenuKeyboardShortcutsOptions): void {
	const { open } = useContextMenuActions();
	const lastPointerPosRef = useRef<ContextMenuPosition>({ x: 0, y: 0 });

	useEffect(() => {
		function handlePointerMove(e: PointerEvent): void {
			lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
		}

		window.addEventListener("pointermove", handlePointerMove);
		return () => window.removeEventListener("pointermove", handlePointerMove);
	}, []);

	useEffect(() => {
		if (disabled) return;

		function handleKeyDown(e: KeyboardEvent): void {
			if (isTypingTarget(e.target)) return;

			const isContextMenuKey = e.key === "ContextMenu";
			const isShiftF10 = e.shiftKey && e.key === "F10";
			if (!isContextMenuKey && !isShiftF10) return;

			const result = getContext();
			if (!result) return;

			e.preventDefault();

			const position =
				getAnchorPositionFromActiveElement(document.activeElement) ?? lastPointerPosRef.current;

			open(position, result.context, result.handlerId);
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [disabled, getContext, open]);
}

