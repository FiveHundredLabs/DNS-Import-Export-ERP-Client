import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { themeService, PRIMARY_COLOR_OPTIONS } from '../services/ThemeService';
import { PrimaryColorOption } from '../types/theme';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/AuthService';

interface ThemeContextValue {
  currentColor: PrimaryColorOption;
  primaryColor: string;
  availableColors: PrimaryColorOption[];
  setPrimaryColor: (hex: string) => { success: boolean; error?: string; color?: PrimaryColorOption };
  canConfigureTheme: boolean;
  currentUser: any;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentColor, setCurrentColor] = useState<PrimaryColorOption>(() =>
    themeService.getPrimaryColor()
  );
  const { currentUser, role } = useAuth();

  useEffect(() => {
    // Keep synchronized with the singleton ThemeService and CSS variables
    const syncColor = themeService.getPrimaryColor();
    setCurrentColor(syncColor);

    const unsubscribe = themeService.subscribe((updatedColor) => {
      setCurrentColor(updatedColor);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const canConfigureTheme = role === 'DIRECTOR';

  const setPrimaryColor = useCallback(
    (hex: string) => {
      const result = themeService.setPrimaryColor(hex, role);
      if (result.success && result.color) {
        setCurrentColor(result.color);
      }
      return result;
    },
    [role]
  );

  const value: ThemeContextValue = {
    currentColor,
    primaryColor: currentColor.hex,
    availableColors: PRIMARY_COLOR_OPTIONS,
    setPrimaryColor,
    canConfigureTheme,
    currentUser,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    // Graceful fallback for components rendered outside ThemeProvider (e.g., isolated unit tests)
    const current = themeService.getPrimaryColor();
    const user = authService.getCurrentUser();
    const canConfig = user?.role === 'DIRECTOR';
    return {
      currentColor: current,
      primaryColor: current.hex,
      availableColors: PRIMARY_COLOR_OPTIONS,
      setPrimaryColor: (hex: string) => themeService.setPrimaryColor(hex, user?.role),
      canConfigureTheme: canConfig,
      currentUser: user,
    };
  }
  return context;
}
