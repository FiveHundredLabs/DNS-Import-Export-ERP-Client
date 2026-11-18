import { useState, useEffect } from 'react';

/**
 * Generic debounce hook for delaying fast-changing values (e.g. search inputs).
 * Prevents triggering network requests or expensive calculations on every single keystroke.
 */
export function useDebounce<T>(value: T, delay = 350): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
