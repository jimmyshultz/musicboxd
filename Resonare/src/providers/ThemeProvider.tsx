import React, { createContext, useContext, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { lightTheme, darkTheme, getTheme, spacing, typography, borderRadius, shadows } from '../utils/theme';

// Type definitions
type ThemeContextType = {
  theme: typeof lightTheme;
  isDark: boolean;
  spacing: typeof spacing;
  typography: typeof typography;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
};

// Create context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme Provider component
interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  try {
    const currentTheme = getTheme(isDark);
    
    // Validate theme before using
    if (!currentTheme || !currentTheme.colors) {
      throw new Error(`Invalid theme returned from getTheme(${isDark})`);
    }

    const contextValue: ThemeContextType = {
      theme: currentTheme,
      isDark,
      spacing,
      typography,
      borderRadius,
      shadows,
    };

    return (
      <ThemeContext.Provider value={contextValue}>
        <PaperProvider theme={currentTheme}>
          {children}
        </PaperProvider>
      </ThemeContext.Provider>
    );
  } catch (error) {
    console.error('🎨 [ERROR] ThemeProvider failed:', error);
    // Return a fallback theme
    return (
      <ThemeContext.Provider value={{
        theme: lightTheme,
        isDark: false,
        spacing,
        typography,
        borderRadius,
        shadows,
      }}>
        <PaperProvider theme={lightTheme}>
          {children}
        </PaperProvider>
      </ThemeContext.Provider>
    );
  }
};

// Custom hook to use theme
export const useAppTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    console.error('🎨 [ERROR] useAppTheme must be used within a ThemeProvider');
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  
  // Debug only when colors are missing
  if (!context.theme?.colors) {
    console.error('🎨 [ERROR] useAppTheme - context.theme.colors is undefined!', context);
  }
  
  return context;
};

// Convenience hook for just colors
export const useThemeColors = () => {
  const { theme } = useAppTheme();
  return theme.colors;
};

// Convenience hook for creating dynamic styles
export const useThemeStyles = <T extends Record<string, any>>(
  createStyles: (theme: ThemeContextType) => T
): T => {
  const themeContext = useAppTheme();
  return createStyles(themeContext);
};