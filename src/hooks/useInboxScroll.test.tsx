import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useInboxScroll } from './useInboxScroll';

function viewport() {
  const node = document.createElement('div');
  Object.defineProperties(node, { scrollHeight: { value: 1500, configurable: true }, clientHeight: { value: 400 } });
  return node;
}

describe('Inbox reading position', () => {
  it('jumps to the first loaded messages and follows new replies at the bottom', () => {
    const { result, rerender } = renderHook(({ id, ready }) => useInboxScroll(id, ready), { initialProps: { id: 'a', ready: false } });
    const node = viewport();
    result.current.scroll.current = node;
    rerender({ id: 'a', ready: true });
    expect(node.scrollTop).toBe(1500);
    Object.defineProperty(node, 'scrollHeight', { value: 1800 });
    rerender({ id: 'b', ready: true });
    expect(node.scrollTop).toBe(1800);
    expect(result.current.showLatest).toBe(false);
  });

  it('keeps the reading position and offers a jump when new replies arrive', () => {
    const { result, rerender } = renderHook(({ id }) => useInboxScroll(id, true), { initialProps: { id: 'a' } });
    const node = viewport();
    result.current.scroll.current = node;
    node.scrollTop = 200;
    act(() => result.current.onScroll());
    rerender({ id: 'b' });
    expect(node.scrollTop).toBe(200);
    expect(result.current.showLatest).toBe(true);
    act(() => result.current.jumpToLatest());
    expect(node.scrollTop).toBe(1500);
    expect(result.current.showLatest).toBe(false);
  });

  it('does not move the reading position when earlier history is prepended', () => {
    const { result, rerender } = renderHook(({ ready }) => useInboxScroll('a', ready), { initialProps: { ready: false } });
    const node = viewport();
    result.current.scroll.current = node;
    rerender({ ready: true });
    node.scrollTop = 50;
    act(() => result.current.onScroll());
    Object.defineProperty(node, 'scrollHeight', { value: 2000 });
    rerender({ ready: true });
    expect(node.scrollTop).toBe(50);
    expect(result.current.showLatest).toBe(false);
  });
});
