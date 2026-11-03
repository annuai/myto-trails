import { createContext, useContext, type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useAppearance } from '@/store/appearance';
import { dark, light, type Palette } from './tokens';

export type Mode = 'light' | 'dark';
type Ctx = { mode: Mode; c: Palette };
const ThemeContext = createContext<Ctx>({ mode: 'light', c: light });

/** The other mode: what a screen is drawn in when the rider has chosen inverted colours. */
export const opposite = (mode: Mode): Mode => (mode === 'dark' ? 'light' : 'dark');

/**
 * Wrap a subtree to force a mode; screens pick light (planning) or dark (riding), see docs/16 §3.
 * With inverted colours on, every mode is swapped for its opposite, so one palette per mode is all that is defined. `fixed` keeps a mode as it is, for
 * the few surfaces that are dark whatever the screen (a banner, the ride bar). `screen` also sets the phone's status bar to read on this mode.
 */
export function Theme({ mode, children, fixed = false, screen = false }: { mode: Mode; children: ReactNode; fixed?: boolean; screen?: boolean }) {
  const inverted = useAppearance((s) => s.inverted);
  const shown = inverted && !fixed ? opposite(mode) : mode;
  return (
    <ThemeContext.Provider value={{ mode: shown, c: shown === 'dark' ? dark : light }}>
      {screen ? <StatusBar style={shown === 'dark' ? 'light' : 'dark'} /> : null}
      {children}
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);
