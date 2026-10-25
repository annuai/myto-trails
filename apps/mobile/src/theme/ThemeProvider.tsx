import { createContext, useContext, type ReactNode } from 'react';
import { dark, light, type Palette } from './tokens';

export type Mode = 'light' | 'dark';
type Ctx = { mode: Mode; c: Palette };
const ThemeContext = createContext<Ctx>({ mode: 'light', c: light });

/** Wrap a subtree to force a mode; screens pick light (planning) or dark (riding), see docs/16 §3. */
export function Theme({ mode, children }: { mode: Mode; children: ReactNode }) {
  return <ThemeContext.Provider value={{ mode, c: mode === 'dark' ? dark : light }}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
