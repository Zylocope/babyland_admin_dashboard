import { createContext, useContext } from 'react';

export const ThemeContext = createContext(null);

export const STYLE_THEMES = ['glass', 'neumorphism', 'flat', 'skeuomorphism'];

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
