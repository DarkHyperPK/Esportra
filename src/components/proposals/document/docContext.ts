import { createContext, useContext } from 'react';

export interface DocMeta {
  /** Left side of every running footer, e.g. "Tournament partner · Prepared for TapShop". */
  footer: string;
  /** Total pages, for the "03 / 06" folio. */
  total: number;
}

export const DocMetaContext = createContext<DocMeta>({ footer: '', total: 0 });

export function useDocMeta(): DocMeta {
  return useContext(DocMetaContext);
}
