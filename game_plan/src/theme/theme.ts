export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  // Primary colors
  primary: string;
  primaryDark: string;
  primaryLight: string;
  
  // Secondary colors
  secondary: string;
  secondaryDark: string;
  
  // Accent colors
  accent: string;
  accentAlt1: string;
  accentAlt2: string;
  accentAlt3: string;
  
  // Water/Wave color
  water: string;
  
  // Background colors
  bg: string;
  bgSecondary: string;
  bgTertiary: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textLight: string;
  
  // Border colors
  border: string;
  borderLight: string;
  
  // Utility colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Shadow
  shadow: string;
  shadowHeavy: string;
}

export const lightTheme: ThemeColors = {
  // Primary - Pink gradient theme
  primary: '#FF6B9D',
  primaryDark: '#E84C7C',
  primaryLight: '#FF85B3',
  
  // Secondary - Purple
  secondary: '#667EEA',
  secondaryDark: '#5568D3',
  
  // Accent colors
  accent: '#667EEA',
  accentAlt1: '#C06C84',
  accentAlt2: '#764BA2',
  accentAlt3: '#6C5B7B',
  
  // Water/Wave
  water: '#0080C0',
  
  // Background
  bg: '#FFFFFF',
  bgSecondary: '#F8F9FA',
  bgTertiary: '#E8F4F8',
  
  // Text
  text: '#2C3E50',
  textSecondary: '#6b7280',
  textLight: '#9CA3AF',
  
  // Border
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  
  // Utility
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  
  // Shadow
  shadow: 'rgba(0, 0, 0, 0.1) 0 10px 15px -3px, rgba(0, 0, 0, 0.05) 0 4px 6px -2px',
  shadowHeavy: 'rgba(0, 0, 0, 0.15) 0 20px 25px -5px, rgba(0, 0, 0, 0.1) 0 10px 10px -5px',
};

export const darkTheme: ThemeColors = {
  // Primary - Pink gradient theme (adjusted for dark)
  primary: '#FF6B9D',
  primaryDark: '#E84C7C',
  primaryLight: '#FF85B3',
  
  // Secondary - Purple (adjusted for dark)
  secondary: '#8B9DEA',
  secondaryDark: '#7A8CD9',
  
  // Accent colors
  accent: '#8B9DEA',
  accentAlt1: '#D88FA0',
  accentAlt2: '#9B7EC8',
  accentAlt3: '#9E8AA0',
  
  // Water/Wave
  water: '#00A8E8',
  
  // Background
  bg: '#16171d',
  bgSecondary: '#1F2028',
  bgTertiary: '#2A2D3A',
  
  // Text
  text: '#E5E7EB',
  textSecondary: '#D1D5DB',
  textLight: '#9CA3AF',
  
  // Border
  border: '#2e303a',
  borderLight: '#3a3d47',
  
  // Utility
  success: '#34d399',
  warning: '#fbbf24',
  error: '#f87171',
  info: '#60a5fa',
  
  // Shadow
  shadow: 'rgba(0, 0, 0, 0.4) 0 10px 15px -3px, rgba(0, 0, 0, 0.25) 0 4px 6px -2px',
  shadowHeavy: 'rgba(0, 0, 0, 0.6) 0 20px 25px -5px, rgba(0, 0, 0, 0.4) 0 10px 10px -5px',
};

export const getTheme = (mode: ThemeMode): ThemeColors => {
  return mode === 'light' ? lightTheme : darkTheme;
};
