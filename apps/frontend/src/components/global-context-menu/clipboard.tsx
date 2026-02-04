import type { File, Folder } from "@petrel/shared";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

export type ClipboardItemKind = "file" | "folder";

export interface ContextMenuClipboardItem {
	kind: ClipboardItemKind;
	id: number;
}

export interface ContextMenuClipboardState {
	items: ContextMenuClipboardItem[];
}

export interface ContextMenuClipboardActions {
	setItems: (items: ContextMenuClipboardItem[]) => void;
	clear: () => void;
}

const ContextMenuClipboardStateContext = createContext<ContextMenuClipboardState | null>(null);
const ContextMenuClipboardActionsContext = createContext<ContextMenuClipboardActions | null>(null);

export function toClipboardItem(item: File | Folder): ContextMenuClipboardItem {
	if ("mimeType" in item) {
		return { kind: "file", id: item.id };
	}
	return { kind: "folder", id: item.id };
}

export function ContextMenuClipboardProvider({ children }: { children: ReactNode }): ReactNode {
	const [items, setItemsState] = useState<ContextMenuClipboardItem[]>([]);

	const setItems = useCallback((nextItems: ContextMenuClipboardItem[]) => {
		setItemsState(nextItems);
	}, []);

	const clear = useCallback(() => {
		setItemsState([]);
	}, []);

	const state = useMemo<ContextMenuClipboardState>(() => ({ items }), [items]);
	const actions = useMemo<ContextMenuClipboardActions>(
		() => ({ setItems, clear }),
		[clear, setItems],
	);

	return (
		<ContextMenuClipboardActionsContext.Provider value={actions}>
			<ContextMenuClipboardStateContext.Provider value={state}>
				{children}
			</ContextMenuClipboardStateContext.Provider>
		</ContextMenuClipboardActionsContext.Provider>
	);
}

export function useContextMenuClipboardState(): ContextMenuClipboardState {
	const state = useContext(ContextMenuClipboardStateContext);
	if (!state) {
		throw new Error(
			"useContextMenuClipboardState must be used within a ContextMenuClipboardProvider",
		);
	}
	return state;
}

export function useContextMenuClipboardActions(): ContextMenuClipboardActions {
	const actions = useContext(ContextMenuClipboardActionsContext);
	if (!actions) {
		throw new Error(
			"useContextMenuClipboardActions must be used within a ContextMenuClipboardProvider",
		);
	}
	return actions;
}
