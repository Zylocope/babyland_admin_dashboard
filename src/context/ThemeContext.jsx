import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

// Visual style themes. 'glass' and 'original' are implemented; the rest are
// listed in Settings but not yet active.
export const STYLE_THEMES = ['glass', 'original', 'neumorphism', 'skeuomorphism', 'flat'];
const ACTIVE_STYLES = ['glass', 'original'];

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
