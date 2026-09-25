import { useThemeContext } from '../context/ThemeContext';
import { PRIMARY_COLOR_OPTIONS } from '../services/ThemeService';

export function useTheme() {
  return useThemeContext();
}

export { PRIMARY_COLOR_OPTIONS };
