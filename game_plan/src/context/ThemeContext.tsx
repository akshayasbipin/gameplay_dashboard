import { createContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import type { ThemeMode, ThemeColors } from '../theme/theme';
import { getTheme } from '../theme/theme';

interface ThemeContextType {
  mode: ThemeMode;
  colors: ThemeColors;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode] = useState<ThemeMode>(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem('theme-mode') as ThemeMode | null;
    if (saved) return saved;
    
    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return 'light';
  });

  const colors = useMemo(() => getTheme(mode), [mode]);

  // Update document class and CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light-theme', 'dark-theme');
    root.classList.add(`${mode}-theme`);
    
    // Update CSS variables
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
    
    // Save preference
    localStorage.setItem('theme-mode', mode);
  }, [mode, colors]);

  const value = useMemo(() => ({
    mode,
    colors,
  }), [mode, colors]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
