import { useCallback, useLayoutEffect, useRef, useState } from 'react';

/** Keep incoming replies from interrupting someone reading earlier messages. */
export function useInboxScroll(latestId: string | undefined, ready: boolean) {
  const scroll = useRef<HTMLDivElement | null>(null);
  const nearBottom = useRef(true);
  const previous = useRef<string>();
  const initialized = useRef(false);
  const [showLatest, setShowLatest] = useState(false);

  const jumpToLatest = useCallback(() => {
    const node = scroll.current;
    if (node) node.scrollTop = node.scrollHeight;
    nearBottom.current = true;
    setShowLatest(false);
  }, []);

  useLayoutEffect(() => {
    if (!ready) return;
    if (!initialized.current || nearBottom.current) jumpToLatest();
    else if (latestId !== previous.current) setShowLatest(true);
    initialized.current = true;
    previous.current = latestId;
  }, [latestId, ready, jumpToLatest]);

  useLayoutEffect(() => {
    const node = scroll.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (nearBottom.current) jumpToLatest();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [jumpToLatest]);

  function onScroll() {
    const node = scroll.current;
    if (!node) return;
    nearBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 100;
    if (nearBottom.current) setShowLatest(false);
  }

  return { scroll, nearBottom, showLatest, jumpToLatest, onScroll };
}
