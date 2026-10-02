import { useEffect, type RefObject } from 'react';

const INTERACTIVE = 'button, a, input, select, textarea, [role="button"], [role="tab"], [data-no-pan]';

/**
 * Click-and-drag on empty canvas to pan a scrollable element (mouse only; touch
 * already scrolls natively). Drags that start on a card or control are ignored.
 */
export function useDragToPan(ref: RefObject<HTMLElement>) {
    useEffect(() => {
        const element = ref.current;
        if (!element) return undefined;
        let start: { x: number; y: number; left: number; top: number } | null = null;

        const onDown = (event: PointerEvent) => {
            if (event.pointerType !== 'mouse' || event.button !== 0) return;
            if (event.target instanceof Element && event.target.closest(INTERACTIVE)) return;
            start = { x: event.clientX, y: event.clientY, left: element.scrollLeft, top: element.scrollTop };
            element.style.cursor = 'grabbing';
        };
        const onMove = (event: PointerEvent) => {
            if (!start) return;
            element.scrollLeft = start.left - (event.clientX - start.x);
            element.scrollTop = start.top - (event.clientY - start.y);
        };
        const onUp = () => {
            start = null;
            element.style.cursor = '';
        };

        element.addEventListener('pointerdown', onDown);
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        return () => {
            element.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
    }, [ref]);
}
