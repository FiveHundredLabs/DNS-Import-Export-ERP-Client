import { useState, useEffect } from 'react';
import { themeService, PRIMARY_COLOR_OPTIONS } from '../services/ThemeService';
import { PrimaryColorOption } from '../types/theme';
import { useAuth } from './useAuth';

export function useTheme() {
  const [currentColor, setCurrentColor] = useState<PrimaryColorOption>(() =>
    themeService.getPrimaryColor()
  );
  const { currentUser, role } = useAuth();

  useEffect(() => {
    // Sync initial state on mount
    setCurrentColor(themeService.getPrimaryColor());

    // Subscribe to real-time updates
    const unsubscribe = themeService.subscribe((updatedColor) => {
      setCurrentColor(updatedColor);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const canConfigureTheme = role === 'DIRECTOR';

  const setPrimaryColor = (hex: string) => {
    return themeService.setPrimaryColor(hex, role);
  };

  return {
    currentColor,
    availableColors: PRIMARY_COLOR_OPTIONS,
    setPrimaryColor,
    canConfigureTheme,
    currentUser,
  };
}
