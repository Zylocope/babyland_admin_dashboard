import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

// Visual style themes — all backed by the shared surface-token system in index.css.
export const STYLE_THEMES = ['glass', 'neumorphism', 'flat', 'skeuomorphism'];
const ACTIVE_STYLES = STYLE_THEMES;

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [styleTheme, setStyleTheme] = useState(() => {
    const saved = localStorage.getItem('al_style');
    return ACTIVE_STYLES.includes(saved) ? saved : 'glass';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.dataset.style = styleTheme;
    localStorage.setItem('al_style', styleTheme);
  }, [styleTheme]);

  const setStyle = (s) => { if (ACTIVE_STYLES.includes(s)) setStyleTheme(s); };

  return (
    <ThemeContext.Provider value={{
      darkMode, toggleDark: () => setDarkMode(v => !v),
      styleTheme, setStyle, activeStyles: ACTIVE_STYLES,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
