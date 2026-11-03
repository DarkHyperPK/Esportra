import { useId } from 'react';

/** A unique prefix for one tab set on the page, so each tab and its panel can point at each other. */
export function useTabBase(): string {
  return `tabs-${useId().replace(/:/g, '')}`;
}
