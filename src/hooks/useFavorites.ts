import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

const DEFAULT_ROLE_FAVORITES: Record<string, string[]> = {
  SALES_REP: ['quotations', 'orders', 'customers', 'warranty'],
  SALES_MANAGER: ['orders', 'quotations', 'customers', 'approvals', 'reports'],
  AREA_MANAGER: ['orders', 'quotations', 'customers', 'approvals', 'reports'],
  STOCK_KEEPER: ['products', 'inventory'],
  CASHIER: ['pos', 'invoices', 'payments'],
  FINANCE_MANAGER: ['invoices', 'payments', 'accounts', 'finance', 'reports'],
  DIRECTOR: ['orders', 'customers', 'invoices', 'inventory', 'finance', 'approvals'],
  MANAGER: ['orders', 'customers', 'invoices', 'inventory', 'finance', 'approvals'],
};

export const getStorageKey = (userId?: string) => {
  return userId ? `dns_erp_sidebar_favorites_${userId}` : 'dns_erp_sidebar_favorites';
};

export const getDefaultFavoritesForRole = (role?: string): string[] => {
  if (role && DEFAULT_ROLE_FAVORITES[role]) {
    return DEFAULT_ROLE_FAVORITES[role];
  }
  return ['orders', 'customers', 'invoices', 'inventory', 'finance'];
};

export function useFavorites() {
  const { currentUser } = useAuth();
  const userId = currentUser?.id;
  const userRole = currentUser?.role;

  const storageKey = getStorageKey(userId);

  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // 1. Check user-scoped key
        if (userId) {
          const userSaved = localStorage.getItem(`dns_erp_sidebar_favorites_${userId}`);
          if (userSaved !== null) {
            return JSON.parse(userSaved);
          }
        }
        // 2. Check legacy key
        const legacy = localStorage.getItem('dns_erp_sidebar_favorites');
        if (legacy !== null) {
          return JSON.parse(legacy);
        }
      }
    } catch (e) {
      console.error('Failed to load favorites from localStorage', e);
    }
    return getDefaultFavoritesForRole(userRole);
  });

  // Keep state synchronized when active user / role changes
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const key = getStorageKey(userId);
        const saved = localStorage.getItem(key);
        if (saved !== null) {
          setFavoriteIds(JSON.parse(saved));
          return;
        }
        const legacy = localStorage.getItem('dns_erp_sidebar_favorites');
        if (legacy !== null) {
          setFavoriteIds(JSON.parse(legacy));
          return;
        }
      }
    } catch (e) {
      console.error('Failed to sync favorites', e);
    }
    setFavoriteIds(getDefaultFavoritesForRole(userRole));
  }, [userId, userRole]);

  const toggleFavorite = useCallback(
    (id: string, itemName?: string, e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      setFavoriteIds((prev) => {
        const isFav = prev.includes(id);
        const next = isFav ? prev.filter((item) => item !== id) : [...prev, id];

        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            const key = getStorageKey(userId);
            localStorage.setItem(key, JSON.stringify(next));
          }
        } catch (e) {
          console.error('Failed to save favorites to localStorage', e);
        }

        const label = itemName || id;
        if (isFav) {
          toast.info(`Removed ${label} from favorites`, { duration: 1500 });
        } else {
          toast.success(`Added ${label} to favorites`, { duration: 1500 });
        }

        return next;
      });
    },
    [userId]
  );

  const isFavorite = useCallback(
    (id: string) => favoriteIds.includes(id),
    [favoriteIds]
  );

  return {
    favoriteIds,
    toggleFavorite,
    isFavorite,
  };
}
