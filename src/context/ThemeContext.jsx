import { useEffect, useState } from 'react';
import { ThemeContext, STYLE_THEMES } from './theme-helpers';

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
