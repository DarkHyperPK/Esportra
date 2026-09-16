import { createContext, useContext } from 'react';
import type { CSSProperties } from 'react';

export interface FramerDropdownContextType {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  close: () => void;
  config: {
    backgroundColor: string;
    borderColor: string;
    accentColor: string;
    borderRadius: number;
    padding: number;
    font: CSSProperties;
    textColor: string;
  };
}

export const FramerDropdownContext = createContext<FramerDropdownContextType | undefined>(undefined);

export const useFramerDropdown = () => {
  const context = useContext(FramerDropdownContext);
  if (!context) throw new Error('FramerDropdown components must be used within FramerDropdownRoot');
  return context;
};
