import { createContext, useContext } from 'react';
import type { TreeContextValue } from './types';

export const TreeContext = createContext<TreeContextValue | null>(null);

export function useTreeContext() {
  const context = useContext(TreeContext);
  if (!context) {
    throw new Error('useTreeContext must be used within TreeContext.Provider');
  }
  return context;
}
