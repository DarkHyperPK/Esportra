import { useCallback, useRef, type WheelEvent } from 'react';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function useBracketWheelScroll<TElement extends HTMLElement>() {
  const scrollRef = useRef<TElement | null>(null);

  const onWheel = useCallback((event: WheelEvent<TElement>) => {
    if (event.ctrlKey || event.defaultPrevented) return;

    const element = event.currentTarget;
    const maxLeft = Math.max(0, element.scrollWidth - element.clientWidth);
    const maxTop = Math.max(0, element.scrollHeight - element.clientHeight);
    if (maxLeft === 0 && maxTop === 0) return;

    let deltaX = event.deltaX;
    let deltaY = event.deltaY;

    if (event.shiftKey && Math.abs(deltaY) > Math.abs(deltaX)) {
      deltaX += deltaY;
      deltaY = 0;
    }

    const canMoveY =
      deltaY !== 0 &&
      ((deltaY < 0 && element.scrollTop > 0) || (deltaY > 0 && element.scrollTop < maxTop));

    if (!canMoveY && maxLeft > 0 && Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      deltaX += event.deltaY;
      deltaY = 0;
    }

    const nextLeft = clamp(element.scrollLeft + deltaX, 0, maxLeft);
    const nextTop = clamp(element.scrollTop + deltaY, 0, maxTop);
    const moved = nextLeft !== element.scrollLeft || nextTop !== element.scrollTop;

    if (!moved) return;

    event.preventDefault();
    event.stopPropagation();
    element.scrollLeft = nextLeft;
    element.scrollTop = nextTop;
  }, []);

  return { scrollRef, onWheel };
}
