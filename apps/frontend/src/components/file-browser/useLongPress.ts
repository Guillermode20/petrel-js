import { useCallback, useRef } from "react";

/**
 * Long press detection threshold in milliseconds
 */
const LONG_PRESS_THRESHOLD = 500;

/**
 * Movement threshold in pixels before canceling long press
 */
const MOVE_THRESHOLD = 10;

interface LongPressPosition {
	x: number;
	y: number;
}

interface UseLongPressOptions {
	onLongPress: (position: LongPressPosition) => void;
	threshold?: number;
}

interface LongPressHandlers {
	onTouchStart: (e: React.TouchEvent) => void;
	onTouchMove: (e: React.TouchEvent) => void;
	onTouchEnd: () => void;
	onTouchCancel: () => void;
}

/**
 * Hook for detecting long press on touch devices
 *
 * Returns touch event handlers to attach to elements.
 * Calls onLongPress callback after threshold ms if touch doesn't move.
 */
export function useLongPress({
	onLongPress,
	threshold = LONG_PRESS_THRESHOLD,
}: UseLongPressOptions): LongPressHandlers {
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const startPosRef = useRef<LongPressPosition>({ x: 0, y: 0 });
	const isLongPressRef = useRef(false);

	const clearTimer = useCallback(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	const handleTouchStart = useCallback(
		(e: React.TouchEvent) => {
			const touch = e.touches[0];
			if (!touch) return;

			startPosRef.current = { x: touch.clientX, y: touch.clientY };
			isLongPressRef.current = false;

			timerRef.current = setTimeout(() => {
				isLongPressRef.current = true;
				onLongPress(startPosRef.current);
			}, threshold);
		},
		[onLongPress, threshold],
	);

	const handleTouchMove = useCallback(
		(e: React.TouchEvent) => {
			const touch = e.touches[0];
			if (!touch) return;

			const dx = Math.abs(touch.clientX - startPosRef.current.x);
			const dy = Math.abs(touch.clientY - startPosRef.current.y);

			// Cancel if moved too far
			if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
				clearTimer();
			}
		},
		[clearTimer],
	);

	const handleTouchEnd = useCallback(() => {
		clearTimer();
	}, [clearTimer]);

	return {
		onTouchStart: handleTouchStart,
		onTouchMove: handleTouchMove,
		onTouchEnd: handleTouchEnd,
		onTouchCancel: handleTouchEnd,
	};
}
