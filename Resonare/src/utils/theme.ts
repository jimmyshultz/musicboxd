import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// Internal color definitions (not exported to avoid circular refs)
const colorDefinitions = {
  light: {
    primary: '#6200EE',
    secondary: '#03DAC6',
    error: '#B00020',
    surface: '#FFFFFF',
    background: '#F5F5F5',
    surfaceVariant: '#E7E0EC',
    text: '#000000',
    textSecondary: '#666666',
    border: '#E0E0E0',
    card: '#FFFFFF',
    onBackground: '#1C1B1F',
    onSurface: '#1C1B1F',
    onSurfaceVariant: '#49454F',
    onPrimary: '#FFFFFF',
    accent: '#6200EE',
    warning: '#FF9500',
  },
  dark: {
    primary: '#BB86FC',
    secondary: '#03DAC6',
    error: '#CF6679',
    surface: '#121212',
    background: '#000000',
    surfaceVariant: '#49454F',
    text: '#FFFFFF',
    textSecondary: '#AAAAAA',
    border: '#333333',
    card: '#1E1E1E',
    onBackground: '#E6E1E5',
    onSurface: '#E6E1E5',
    onSurfaceVariant: '#CAC4D0',
    onPrimary: '#381E72',
    accent: '#BB86FC',
    warning: '#FFB74D',
  }
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colorDefinitions.light.primary,
    secondary: colorDefinitions.light.secondary,
    surface: colorDefinitions.light.surface,
    background: colorDefinitions.light.background,
    surfaceVariant: colorDefinitions.light.surfaceVariant,
    error: colorDefinitions.light.error,
    onSurface: colorDefinitions.light.onSurface,
    onBackground: colorDefinitions.light.onBackground,
    onSurfaceVariant: colorDefinitions.light.onSurfaceVariant,
    onPrimary: colorDefinitions.light.onPrimary,
    // Custom colors
    text: colorDefinitions.light.text,
    textSecondary: colorDefinitions.light.textSecondary,
    border: colorDefinitions.light.border,
    card: colorDefinitions.light.card,
    accent: colorDefinitions.light.accent,
    warning: colorDefinitions.light.warning,
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colorDefinitions.dark.primary,
    secondary: colorDefinitions.dark.secondary,
    surface: colorDefinitions.dark.surface,
    background: colorDefinitions.dark.background,
    surfaceVariant: colorDefinitions.dark.surfaceVariant,
    error: colorDefinitions.dark.error,
    onSurface: colorDefinitions.dark.onSurface,
    onBackground: colorDefinitions.dark.onBackground,
    onSurfaceVariant: colorDefinitions.dark.onSurfaceVariant,
    onPrimary: colorDefinitions.dark.onPrimary,
    // Custom colors
    text: colorDefinitions.dark.text,
    textSecondary: colorDefinitions.dark.textSecondary,
    border: colorDefinitions.dark.border,
    card: colorDefinitions.dark.card,
    accent: colorDefinitions.dark.accent,
    warning: colorDefinitions.dark.warning,
  },
};

// Typography system
export const typography = {
  h1: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    lineHeight: 34,
  },
  h2: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    lineHeight: 30,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 26,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  body1: {
    fontSize: 16,
    fontWeight: 'normal' as const,
    lineHeight: 22,
  },
  body2: {
    fontSize: 14,
    fontWeight: 'normal' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: 'normal' as const,
    lineHeight: 16,
  },
  button: {
    fontSize: 14,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
  },
};

// Spacing system
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
};

// Shadows
export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
};

// Legacy colors for backward compatibility
const legacyColors = {
  ...colorDefinitions.light,
  dark: colorDefinitions.dark,
};

// Export colors for external use (after legacyColors is defined)
export const colors = colorDefinitions;

export const theme = {
  light: lightTheme,
  dark: darkTheme,
  colors: legacyColors, // Backward compatible colors
  typography,
  spacing,
  borderRadius,
  shadows,
};

// Theme utility functions
export const getTheme = (isDark: boolean) => isDark ? darkTheme : lightTheme;